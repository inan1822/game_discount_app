import axios from "axios"
import Bottleneck from "bottleneck"
import Fuse from "fuse.js"
import fs from "fs"
import path from "path"
import { AppError } from "../../shared/utils/AppError.js"
import WishlistModel from "../wishlist/Wishlist.model.js"

const RAWG_BASE = "https://api.rawg.io/api"
const RAWG_KEY = process.env.RAWG_API

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RawgGame {
    id: number
    slug: string
    name: string
    background_image: string | null
    rating: number
    ratings_count: number
    added: number                          // users who added to their library → community size
    genres: { id: number; name: string; slug: string }[]
    platforms: { platform: { id: number; name: string; slug: string } }[] | null
    parent_platforms: { platform: { id: number; name: string; slug: string } }[] | null
    released: string
    metacritic: number | null
    stores?: { store: { slug: string; name: string }; url: string }[]   // only in /games/:id detail
}

export interface GameSearchResult {
    id: number
    slug: string
    name: string
    cover: string | null
    rating: number
    genres: string[]
    platforms: string[]
    released: string
    metacritic: number | null
    steamAppId?: string        // extracted from RAWG stores — only in game detail
}

/** CheapShark /games search result */
interface CsGameCandidate {
    gameID: string
    external: string   // game title on CheapShark
    cheapest: string
    cheapestDealID: string
}

/** CheapShark /stores entry */
interface CsStore { storeID: string; storeName: string; images: { icon: string } }

/** CheapShark /deals entry */
interface CsDeal { storeID: string; dealID: string; salePrice: string; normalPrice: string; savings: string }

/** GamerPower raw API response item */
interface GamerPowerRaw {
    id: number
    title: string
    worth: string
    thumbnail: string
    description: string
    instructions: string
    open_giveaway_url: string
    end_date: string
    platforms: string
    users: number
}

/** ITAD raw deal from /games/prices/v3 — field shapes verified against API spec v2.9 */
interface ItadRawDeal {
    shop: { id: number; name: string }   // id is a number (e.g. 61 = Steam, 35 = GOG)
    price: { amount: number; amountInt: number; currency: string }
    regular: { amount: number; amountInt: number; currency: string }
    cut: number
    voucher: string | null
    storeLow: { amount: number; amountInt: number; currency: string } | null
    flag: string | null
    drm: { id: number; name: string }[]
    platforms: { id: number; name: string }[]
    timestamp: string
    expiry: string | null
    url: string
}

// ─── Retry helper ─────────────────────────────────────────────────────────────

/**
 * Calls `fn` and retries with exponential backoff on failure.
 * Rate-limit responses (HTTP 429) back off 2× harder, capped at 8 s total wait.
 * Without the cap, 20 concurrent home-page price requests can each sit in
 * 146-second backoff loops when CheapShark rate-limits the burst.
 */
const MAX_RETRY_WAIT = 8_000   // ms — never wait longer than 8 s per retry

const withRetry = async <T>(
    fn: () => Promise<T>,
    retries = 3,
    delayMs = 500,
    retryOn429 = true,   // set false to fail-fast on rate limits (no waiting)
): Promise<T> => {
    try {
        return await fn()
    } catch (err: unknown) {
        if (retries <= 0) throw err
        const is429 = axios.isAxiosError(err) && err.response?.status === 429
        // When retryOn429=false: throw immediately on rate-limit so the caller
        // returns null/empty right away instead of waiting 7-21 seconds for
        // a retry that will almost certainly get rate-limited again.
        if (is429 && !retryOn429) throw err
        const rawWait = is429 ? delayMs * 2 : delayMs
        const wait = Math.min(rawWait, MAX_RETRY_WAIT)
        await new Promise(r => setTimeout(r, wait))
        return withRetry(fn, retries - 1, wait, retryOn429)
    }
}

// ─── CheapShark rate limiter (bottleneck) ────────────────────────────────────
// Replaces the manual semaphore that used to live here. Bottleneck handles
// max-concurrency + min-gap-between-calls + queue-timeout cleanly, plus exposes
// priority scheduling that SWR background refreshes use (priority 9 = low).
//
// Why we need queue-timeout-ish behavior: without it, 20 uncached titles queue
// behind 2 slots. We pass { expiration: 3000 } per job so a stuck queue throws
// BSExpired after 3 s instead of stalling — callers catch it and degrade to
// null/empty results.
//
// Why minTime: smooths bursts so 20 cards don't fire 10 simultaneous CheapShark
// calls. 200 ms gap ≈ 5 req/s, comfortably under CheapShark's effective limit.

const csLimiter = new Bottleneck({
    maxConcurrent: 2,
    minTime: 200,
})

/** Wrap any CheapShark axios call. Returns null/empty on BSExpired queue-timeout. */
function isBSExpired(err: unknown): boolean {
    return err instanceof Error && (err as Error & { name: string }).name === "BottleneckError"
        && /BSExpired/.test((err as Error).message)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatGame = (game: RawgGame): GameSearchResult => ({
    id: game.id,
    slug: game.slug,
    name: game.name,
    cover: game.background_image,
    rating: game.rating,
    genres: game.genres?.map(g => g.name) ?? [],
    // Use specific platforms if available, fall back to parent_platforms for broader coverage
    platforms: (game.platforms?.length
        ? game.platforms
        : game.parent_platforms ?? []
    ).map(p => p.platform.name),
    released: game.released,
    metacritic: game.metacritic,
})

/** Returns "YYYY-MM-DD,YYYY-MM-DD" from N years ago to today */
function dateRange(yearsBack: number): string {
    const today = new Date()
    const past = new Date()
    past.setFullYear(today.getFullYear() - yearsBack)
    const fmt = (d: Date) => d.toISOString().split("T")[0]
    return `${fmt(past)},${fmt(today)}`
}

// ─── RAWG Cache ───────────────────────────────────────────────────────────────

const rawgCache = new Map<string, { data: unknown; expiresAt: number }>()
const RAWG_TTL = 10 * 60 * 1000  // 10 minutes

/** Fetch from RAWG only if not cached; otherwise return cached value. */
async function cachedRawg<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const hit = rawgCache.get(key)
    if (hit && hit.expiresAt > Date.now()) return hit.data as T
    const data = await fetcher()
    rawgCache.set(key, { data, expiresAt: Date.now() + RAWG_TTL })
    return data
}

// ─── Services ─────────────────────────────────────────────────────────────────

/** Search — no DLC (not cached — every query is unique) */
export const searchGamesService = async (query: string, page = 1): Promise<GameSearchResult[]> => {
    if (!query || query.trim().length < 2) {
        throw new AppError("Search query must be at least 2 characters", 400)
    }
    const { data } = await axios.get(`${RAWG_BASE}/games`, {
        params: {
            key: RAWG_KEY,
            search: query,
            page_size: 20,
            page,
            exclude_additions: true,
        }
    })
    return (data.results as RawgGame[]).map(formatGame)
}

/** Extract Steam AppID from RAWG store list (e.g. "https://store.steampowered.com/app/105600" → "105600") */
function extractSteamAppId(stores?: { store: { slug: string }; url: string }[]): string | undefined {
    const s = stores?.find(st => st.store.slug === "steam")
    if (!s) return undefined
    const m = s.url.match(/\/app\/(\d+)/)
    return m ? m[1] : undefined
}

/**
 * Fallback: look up a Steam AppID by game title using Steam's own store search API.
 * Used when RAWG does not return store data for a game (common for some titles).
 * Requires an exact title match (case-insensitive) — no fuzzy matching to avoid
 * returning the wrong game's AppID. Cached 24 hours (AppIDs are permanent).
 */
const steamIdByTitleCache = new Map<string, { id: string | null; expiresAt: number }>()
const STEAM_ID_TTL = 24 * 60 * 60 * 1000  // 24 hours

async function findSteamAppIdByTitle(title: string): Promise<string | null> {
    const key = title.toLowerCase().trim()
    const hit = steamIdByTitleCache.get(key)
    if (hit && hit.expiresAt > Date.now()) return hit.id

    const save = (id: string | null) => {
        steamIdByTitleCache.set(key, { id, expiresAt: Date.now() + STEAM_ID_TTL })
        return id
    }

    try {
        const { data } = await axios.get<{ items?: { id: number; name: string; type?: string }[] }>(
            "https://store.steampowered.com/api/storesearch/",
            { params: { term: title, l: "english", cc: "US" }, timeout: 6000 },
        )

        // Strip special chars (trademark symbols, punctuation) so "NieR:Automata™"
        // matches "NieR:Automata". Keep alphanumerics, spaces, collapse runs of spaces.
        const norm = (s: string) =>
            s.toLowerCase()
             .replace(/[^a-z0-9 ]/g, " ")
             .replace(/\s+/g, " ")
             .trim()
        const normed = norm(title)

        // Steam returns a mix of base games, DLC, soundtracks, music albums, demos,
        // bundles, art books, season passes. We only want the base game (`type: "app"`).
        // Some apps are mislabeled, so we also reject by keyword in the NAME.
        const REJECT_KEYWORDS = [
            "dlc", "soundtrack", "ost", "season pass", "season",
            "expansion", "artbook", "art book", "demo", "bundle",
            "album", "arrangement", "music", "ep ", "official",
            "anniversary edition", "yorha edition", "deluxe edition",
            "complete edition", "ultimate edition", "definitive edition",
            "game of the year",
        ]
        const items = (data.items ?? []).filter(item => {
            if (item.type && item.type !== "app") return false
            const n = norm(item.name)
            // Don't reject if the search title itself contains a reject keyword
            // (e.g. searching "Halo: Combat Evolved Anniversary" should not be filtered)
            if (REJECT_KEYWORDS.some(kw => normed.includes(kw))) return true
            return !REJECT_KEYWORDS.some(kw => n.includes(kw))
        })

        // 1. Exact match wins (most reliable signal)
        // 2. Otherwise pick the SHORTEST name among items that contain our title —
        //    base games have the shortest name (e.g. "NieR:Automata" beats
        //    "NieR:Automata Game of the YoRHa Edition")
        let match = items.find(item => norm(item.name) === normed)
        if (!match) {
            const candidates = items
                .filter(item => norm(item.name).includes(normed))
                .sort((a, b) => a.name.length - b.name.length)
            match = candidates[0]
        }

        // 3. Last-resort fallback: when the strict filter rejected everything BUT
        //    the unfiltered results contain an edition-variant of our title (e.g.
        //    Steam only sells "Grand Theft Auto IV: Complete Edition" — there is
        //    no plain "Grand Theft Auto IV" SKU). Accept the shortest such variant.
        if (!match) {
            const rawItems = (data.items ?? []).filter(it => !it.type || it.type === "app")
            const editionMatches = rawItems
                .filter(it => isEditionVariant(it.name, title))
                .sort((a, b) => a.name.length - b.name.length)
            if (editionMatches[0]) {
                match = editionMatches[0]
                console.log(`[Steam] AppID fallback: "${title}" accepted edition variant "${match.name}"`)
            }
        }

        if (match) {
            console.log(`[Steam] AppID fallback: "${title}" → ${match.name} (${match.id})`)
            return save(String(match.id))
        }
        console.log(`[Steam] AppID fallback: "${title}" → no valid base-game match (${(data.items ?? []).length} item(s) returned, ${items.length} after filtering)`)
        return save(null)
    } catch (err) {
        console.warn("[Steam] AppID search failed for:", title, err instanceof Error ? err.message : String(err))
        return null  // not cached — allow retry on next request
    }
}

/**
 * Resolve a Steam AppID for `game`, with provenance, in this priority order:
 *
 *   1. `override`       — KNOWN_STEAM_APPIDS map (verified hand-curated)
 *   2. `steamAppId`     — caller-supplied appid (already verified upstream)
 *   3. `resolverCache`  — file-backed rawgId → appid cache (populated by
 *                          previous game-page visits or card-lookup fallthroughs)
 *   4. `titleLookup`    — fall through to RAWG `/games/:id`, extract Steam URL.
 *                          Result (including `null` for games not on Steam) is
 *                          written to the resolver cache before returning.
 *
 * The `source` return value is critical for SWR — high-confidence sources
 * (override / steamAppId / resolverCache) earn a longer cache TTL than
 * `titleLookup` results that may have matched fuzzily.
 */
type SteamAppIdSource = 'override' | 'steamAppId' | 'resolverCache' | 'titleLookup'
async function resolveSteamAppIdCascade(
    game: { id: number; name: string; steamAppId?: string },
): Promise<{ appid: string | undefined; source: SteamAppIdSource }> {
    // 1. Verified override
    const overrideAppid = KNOWN_STEAM_APPIDS[game.id]
    if (overrideAppid) return { appid: overrideAppid, source: 'override' }

    // 2. Caller-supplied (game-page flow already extracted it)
    if (game.steamAppId) return { appid: game.steamAppId, source: 'steamAppId' }

    // 3. Persistent resolver cache hit (populated by prior detail-page visits)
    const cached = resolverCache.get(game.id)
    if (cached && cached.expiresAt > Date.now()) {
        return { appid: cached.appid ?? undefined, source: 'resolverCache' }
    }

    // 4. Fall through to RAWG /games/:id to discover the Steam store URL
    try {
        const { data } = await axios.get(`${RAWG_BASE}/games/${game.id}`, {
            params:  { key: RAWG_KEY },
            timeout: 8000,
        })
        const appid = extractSteamAppId(data?.stores) ?? null
        writeResolverEntry(game.id, appid)
        if (appid) {
            console.log(`[Resolver] discovered rawgId=${game.id} → steamAppId=${appid} for "${game.name}"`)
        } else {
            console.log(`[Resolver] rawgId=${game.id} "${game.name}" not on Steam (cached null for 24h)`)
        }
        return { appid: appid ?? undefined, source: 'titleLookup' }
    } catch (err) {
        console.warn(`[Resolver] RAWG /games/${game.id} failed:`, err instanceof Error ? err.message : String(err))
        // Do not write a null cache here — transient failures should retry next time.
        return { appid: undefined, source: 'titleLookup' }
    }
}

/** Single game detail — cached 10 min */
export const getGameByIdService = async (id: string): Promise<GameSearchResult & { description: string }> => {
    return cachedRawg(`game:${id}`, async () => {
        const { data } = await axios.get(`${RAWG_BASE}/games/${id}`, {
            params: { key: RAWG_KEY }
        })
        if (!data || !data.id) throw new AppError("Game not found", 404)

        // Primary: extract from RAWG store list
        // Override:  manual KNOWN_STEAM_APPIDS map wins over RAWG/Steam fallback
        //            for games where RAWG returns the wrong Steam SKU (e.g. a remake
        //            instead of the original) or where matching is unreliable.
        // Fallback: query Steam Store Search API when RAWG has no Steam entry
        const numericId = Number(data.id)
        let steamAppId: string | undefined = KNOWN_STEAM_APPIDS[numericId] ?? extractSteamAppId(data.stores)
        if (!steamAppId) {
            steamAppId = await findSteamAppIdByTitle(data.name).catch(() => null) ?? undefined
        }

        // Eagerly populate the resolver cache so the home card for this game
        // skips its title lookup on the next render. Write `null` for games
        // genuinely not on Steam (after the title fallback also failed), so
        // we don't re-fire RAWG /games/:id from the card path for 24h.
        writeResolverEntry(numericId, steamAppId ?? null)

        // Prefer IGDB's editorial summary when RAWG description is absent or very short
        let description = data.description_raw ?? ""
        if (description.length < 150 && process.env.IGDB_CLIENT_ID) {
            const igdbSummary = await getIgdbSummaryService(data.name, steamAppId).catch(() => null)
            if (igdbSummary) description = igdbSummary
        }

        return { ...formatGame(data), description, steamAppId }
    })
}

/** POPULAR — cached 10 min per page */
export const getPopularGamesService = async (page = 1): Promise<GameSearchResult[]> => {
    return cachedRawg(`popular:${page}`, async () => {
        const { data } = await axios.get(`${RAWG_BASE}/games`, {
            params: {
                key: RAWG_KEY,
                ordering: "-added",
                page_size: 20,
                page,
                exclude_additions: true,
                metacritic: "70,100",
            }
        })
        return (data.results as RawgGame[]).map(formatGame)
    })
}

/** NEW — cached 10 min per page */
export const getNewGamesService = async (page = 1): Promise<GameSearchResult[]> => {
    return cachedRawg(`new:${page}`, async () => {
        const { data } = await axios.get(`${RAWG_BASE}/games`, {
            params: {
                key: RAWG_KEY,
                dates: dateRange(1),
                ordering: "-released",
                page_size: 20,
                page,
                exclude_additions: true,
            }
        })
        return (data.results as RawgGame[]).map(formatGame)
    })
}

/** TRENDED — cached 10 min per page */
export const getTrendedGamesService = async (page = 1): Promise<GameSearchResult[]> => {
    return cachedRawg(`trended:${page}`, async () => {
        const { data } = await axios.get(`${RAWG_BASE}/games`, {
            params: {
                key: RAWG_KEY,
                dates: dateRange(3),
                ordering: "-added",
                page_size: 20,
                page,
                exclude_additions: true,
            }
        })
        return (data.results as RawgGame[]).map(formatGame)
    })
}

/** FREE TO PLAY — cached 10 min */
export const getFreeToPlayService = async (): Promise<GameSearchResult[]> => {
    return cachedRawg("free-to-play", async () => {
        const { data } = await axios.get(`${RAWG_BASE}/games`, {
            params: {
                key: RAWG_KEY,
                tags: "free-to-play",
                ordering: "-added",
                page_size: 20,
                exclude_additions: true,
                metacritic: "60,100",
            }
        })
        return (data.results as RawgGame[]).map(formatGame)
    })
}

/** HIDDEN GEMS — high rating (≥4.0), lower popularity (sort by rating), cached 10 min */
export const getHiddenGemsService = async (): Promise<GameSearchResult[]> => {
    return cachedRawg("hidden-gems", async () => {
        const { data } = await axios.get(`${RAWG_BASE}/games`, {
            params: {
                key: RAWG_KEY,
                ordering: "-rating",
                page_size: 40,
                exclude_additions: true,
                metacritic: "75,100",
            }
        })
        // Filter to games with relatively low "added" count — hidden but good
        const results = (data.results as RawgGame[])
            .filter(g => g.added < 50_000 && g.rating >= 4.0)
            .slice(0, 20)
        return results.map(formatGame)
    })
}

/** DEAL OF THE DAY — best single deal from CheapShark (highest savings %), cached 1 hour */
export interface DealOfDay {
    title: string
    cover: string | null
    salePrice: string
    normalPrice: string
    savings: number
    storeName: string
    storeIcon: string
    dealLink: string
    gameId: number | null   // RAWG id if we can match
}

let dotdCache: { deal: DealOfDay; expiresAt: number } | null = null
const DOTD_TTL = 60 * 60 * 1000  // 1 hour

export const getDealOfDayService = async (): Promise<DealOfDay | null> => {
    if (dotdCache && dotdCache.expiresAt > Date.now()) return dotdCache.deal

    try {
        // CheapShark: top deal by savings. Routed through csLimiter so it shares
        // rate-limit budget with card-price and deal-page calls.
        const [dealsRes, stores] = await Promise.all([
            csLimiter.schedule({ expiration: 5000 }, () =>
                axios.get("https://www.cheapshark.com/api/1.0/deals", {
                    params: { sortBy: "Savings", pageSize: 5, lowerPrice: 1 }
                }),
            ),
            csLimiter.schedule({ expiration: 5000 }, () =>
                axios.get<{ storeID: string; storeName: string; images: { icon: string } }[]>(
                    "https://www.cheapshark.com/api/1.0/stores"
                ),
            ),
        ])

        const top = dealsRes.data[0]
        if (!top) return null

        const storeMap = Object.fromEntries(stores.data.map((s: { storeID: string; storeName: string; images: { icon: string } }) => [s.storeID, s]))
        const store = storeMap[top.storeID]

        // Try to enrich with RAWG cover
        let cover: string | null = null
        let gameId: number | null = null
        try {
            const { data: rawgData } = await axios.get(`${RAWG_BASE}/games`, {
                params: { key: RAWG_KEY, search: top.title, page_size: 1 }
            })
            if (rawgData.results?.[0]) {
                cover = rawgData.results[0].background_image
                gameId = rawgData.results[0].id
            }
        } catch (err) {
            console.warn("[DealOfDay] Failed to enrich cover from RAWG:", err instanceof Error ? err.message : String(err))
        }

        const deal: DealOfDay = {
            title: top.title,
            cover,
            salePrice: top.salePrice,
            normalPrice: top.normalPrice,
            savings: parseFloat(top.savings),
            storeName: store?.storeName ?? `Store ${top.storeID}`,
            storeIcon: store ? `https://www.cheapshark.com${store.images.icon}` : "",
            dealLink: `https://www.cheapshark.com/redirect?dealID=${top.dealID}`,
            gameId,
        }

        dotdCache = { deal, expiresAt: Date.now() + DOTD_TTL }
        return deal
    } catch (err) {
        console.error("[DealOfDay] Fetch failed:", err instanceof Error ? err.message : String(err))
        return null
    }
}

/** BY GENRE — cached 10 min per genre */
export const getByGenreService = async (genre: string, page = 1): Promise<GameSearchResult[]> => {
    return cachedRawg(`by-genre:${genre}:${page}`, async () => {
        const { data } = await axios.get(`${RAWG_BASE}/games`, {
            params: {
                key: RAWG_KEY,
                genres: genre,
                ordering: "-added",
                page_size: 20,
                page,
                exclude_additions: true,
            }
        })
        return (data.results as RawgGame[]).map(formatGame)
    })
}

/**
 * FOR YOU — personalised recommendations based on the user's wishlist.
 * Algorithm:
 *   1. Load user's wishlist (up to 5 games).
 *   2. Fetch each game's genres from RAWG.
 *   3. Tally genre frequency → pick the top genre.
 *   4. Return popular games in that genre, excluding games already on the wishlist.
 *   Fallback: if wishlist is empty → return Popular.
 */
export const getForYouService = async (userId: string): Promise<GameSearchResult[]> => {
    const wishlist = await WishlistModel.find({ userId }).limit(5).lean()

    if (wishlist.length === 0) {
        // No saved games yet → fall back to popular
        return getPopularGamesService()
    }

    // Fetch genre info for each wishlisted game in parallel (cached)
    const genreCount: Record<string, number> = {}
    await Promise.allSettled(
        wishlist.map(async (item) => {
            const gameData = await cachedRawg<{ genres?: { slug: string }[] }>(`game:${item.gameId}`, async () => {
                const { data } = await axios.get(`${RAWG_BASE}/games/${item.gameId}`, {
                    params: { key: RAWG_KEY }
                })
                return data
            })
            for (const g of (gameData.genres ?? [])) {
                genreCount[g.slug] = (genreCount[g.slug] ?? 0) + 1
            }
        })
    )

    // Top genre by frequency
    const topGenre = Object.entries(genreCount).sort((a, b) => b[1] - a[1])[0]?.[0]
    if (!topGenre) return getPopularGamesService()

    // Fetch games in that genre, exclude already-wishlisted games (cached)
    const { results: genreResults } = await cachedRawg<{ results: RawgGame[] }>(`for-you:${topGenre}`, async () => {
        const { data } = await axios.get(`${RAWG_BASE}/games`, {
            params: {
                key: RAWG_KEY,
                genres: topGenre,
                ordering: "-added",
                page_size: 30,
                exclude_additions: true,
            }
        })
        return data
    })
    const data = { results: genreResults }

    const wishlisted = new Set(wishlist.map(w => String(w.gameId)))
    return (data.results as RawgGame[])
        .filter(g => !wishlisted.has(String(g.id)))
        .slice(0, 20)
        .map(formatGame)
}

// ─── Price (CheapShark proxy) ─────────────────────────────────────────────────

// ─── File-backed price cache ──────────────────────────────────────────────────
// Survives nodemon/server restarts — so we never hammer CheapShark after a reload.

type PriceCacheEntry = { price: string | null; expiresAt: number }
const CACHE_TTL = 60 * 60 * 1000   // 1 hour
const PRICE_CACHE_FILE = path.join(process.cwd(), "src/cache/prices.json")

const priceCache = new Map<string, PriceCacheEntry>()

function loadPriceCacheFromDisk() {
    try {
        if (!fs.existsSync(PRICE_CACHE_FILE)) return
        const raw = JSON.parse(fs.readFileSync(PRICE_CACHE_FILE, "utf8")) as Record<string, PriceCacheEntry>
        let loaded = 0
        for (const [k, v] of Object.entries(raw)) {
            if (v.expiresAt > Date.now()) { priceCache.set(k, v); loaded++ }
        }
        if (loaded) console.log(`[PriceCache] Loaded ${loaded} prices from disk`)
    } catch (err) {
        console.warn("[PriceCache] Failed to load from disk:", err instanceof Error ? err.message : String(err))
    }
}

function savePriceCacheToDisk() {
    try {
        const dir = path.dirname(PRICE_CACHE_FILE)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(PRICE_CACHE_FILE, JSON.stringify(Object.fromEntries(priceCache)))
    } catch (err) {
        console.warn("[PriceCache] Failed to save to disk:", err instanceof Error ? err.message : String(err))
    }
}

// Debounced disk write — at most one write per 30 s regardless of how many
// price fetches complete in that window (avoids per-request fs.writeFileSync).
let _diskSaveTimer: ReturnType<typeof setTimeout> | null = null
function scheduleDiskSave() {
    if (_diskSaveTimer) return          // already scheduled
    _diskSaveTimer = setTimeout(() => {
        _diskSaveTimer = null
        savePriceCacheToDisk()
    }, 30_000)
}

loadPriceCacheFromDisk()   // run once at module load

// ─── File-backed RAWG → Steam AppID resolver cache ──────────────────────────
// Closes the home-vs-game-page accuracy gap:
//   - RAWG's /games list endpoint never returns store URLs, so home cards
//     don't get a steamAppId and fall back to less-reliable title lookup.
//   - RAWG's /games/:id detail endpoint DOES return store URLs.
//   - We persist `rawgId → steamAppId` discoveries to disk so once any user
//     visits a game's detail page (or a card lookup falls through to RAWG),
//     every future card request uses the verified appid.
//
// Storage matches the price cache pattern (file-backed, debounced writes).

type ResolverEntry = { appid: string | null; resolvedAt: number; expiresAt: number }
const RESOLVER_CACHE_FILE  = path.join(process.cwd(), "src/cache/rawg-steam-appids.json")
const RESOLVER_TTL_FOUND   = 30 * 24 * 60 * 60 * 1000   // 30 days — Steam appids are permanent
const RESOLVER_TTL_NOTFOUND = 24 * 60 * 60 * 1000        // 1 day  — retry games maybe added to Steam later

const resolverCache = new Map<number, ResolverEntry>()

function loadResolverCacheFromDisk() {
    try {
        if (!fs.existsSync(RESOLVER_CACHE_FILE)) return
        const raw = JSON.parse(fs.readFileSync(RESOLVER_CACHE_FILE, "utf8")) as Record<string, ResolverEntry>
        let loaded = 0
        for (const [k, v] of Object.entries(raw)) {
            if (v.expiresAt > Date.now()) { resolverCache.set(Number(k), v); loaded++ }
        }
        if (loaded) console.log(`[Resolver] Loaded ${loaded} rawgId→steamAppId mappings from disk`)
    } catch (err) {
        console.warn("[Resolver] Failed to load from disk:", err instanceof Error ? err.message : String(err))
    }
}

function saveResolverCacheToDisk() {
    try {
        const dir = path.dirname(RESOLVER_CACHE_FILE)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(RESOLVER_CACHE_FILE, JSON.stringify(Object.fromEntries(resolverCache)))
    } catch (err) {
        console.warn("[Resolver] Failed to save to disk:", err instanceof Error ? err.message : String(err))
    }
}

let _resolverSaveTimer: ReturnType<typeof setTimeout> | null = null
function scheduleResolverDiskSave() {
    if (_resolverSaveTimer) return
    _resolverSaveTimer = setTimeout(() => {
        _resolverSaveTimer = null
        saveResolverCacheToDisk()
    }, 30_000)
}

function writeResolverEntry(rawgId: number, appid: string | null) {
    const ttl = appid ? RESOLVER_TTL_FOUND : RESOLVER_TTL_NOTFOUND
    resolverCache.set(rawgId, { appid, resolvedAt: Date.now(), expiresAt: Date.now() + ttl })
    scheduleResolverDiskSave()
}

loadResolverCacheFromDisk()   // run once at module load

// ─── In-flight request deduplication ─────────────────────────────────────────
// If two browser tabs request the price for the same title simultaneously, the
// second call reuses the existing Promise instead of making a second CheapShark
// call. This halves rate pressure when multiple tabs are open.
const priceInflight = new Map<string, Promise<string | null>>()

/**
 * Returns the current lowest price for a game from CheapShark, or null when not found.
 * null  = not in CheapShark DB (console exclusive, very new) → card shows "Unknown"
 * "0.00"= in DB and genuinely free (Dota 2, CS2, Warframe)  → card shows "Free"
 */
export const getGamePriceService = async (title: string): Promise<string | null> => {
    const key = title.toLowerCase().trim()
    const cached = priceCache.get(key)
    if (cached && cached.expiresAt > Date.now()) return cached.price

    // Dedup: if already in-flight, reuse the same promise
    const inflight = priceInflight.get(key)
    if (inflight) return inflight

    const promise = (async (): Promise<string | null> => {
        // Throttle via bottleneck. { expiration: 3000 } makes the job throw
        // BSExpired after 3 s in the queue — we treat that as "give up, return null"
        // rather than waiting behind 18 other titles all about to get 429 anyway.
        try {
            const { data } = await csLimiter.schedule({ expiration: 3000 }, () =>
                withRetry(
                    () => axios.get("https://www.cheapshark.com/api/1.0/games", {
                        params: { title, limit: 5 },
                    }),
                    2,      // 2 retries for transient network errors (not 429)
                    500,
                    false,  // retryOn429 = false → fail-fast on rate-limits
                ),
            )
            // Validate the returned game name against the requested title using Fuse.js.
            // CheapShark returns the first alphabetical match for "limit: N" — without
            // validation "GTA" can return "Grand Theft Arcade" instead of "Grand Theft Auto V".
            let price: string | null = null
            if (Array.isArray(data) && data.length > 0) {
                const fuse = new Fuse(data as CsGameCandidate[], {
                    keys: ["external"],
                    includeScore: true,
                    threshold: 0.35,
                })
                const hit = fuse.search(title)[0]
                if (hit && hit.item?.cheapest != null) {
                    price = String(hit.item.cheapest)
                }
            }
            const entry: PriceCacheEntry = { price, expiresAt: Date.now() + CACHE_TTL }
            priceCache.set(key, entry)
            scheduleDiskSave()          // debounced — at most one write per 30 s
            return price
        } catch (err: unknown) {
            if (isBSExpired(err)) return null   // queue timeout — degrade silently
            const msg = err instanceof Error ? err.message : String(err)
            console.error(`[CheapShark] error for "${title}": ${msg}`)
            // Cache null for 3 min so repeated requests don't hammer CheapShark again
            priceCache.set(key, { price: null, expiresAt: Date.now() + 3 * 60 * 1000 })
            return null
        }
    })()

    priceInflight.set(key, promise)
    promise.finally(() => priceInflight.delete(key))
    return promise
}

// ─── Deals — ITAD primary + CheapShark fallback ──────────────────────────────

// ── CheapShark store cache (icons) ───────────────────────────────────────────

let csStoresCache: CsStore[] | null = null
let csStoresExpiry = 0
const CS_STORES_TTL = 24 * 60 * 60 * 1000

// Module-level icon map cache — rebuilt only when the stores list refreshes
let csIconMapCache: Map<string, string> | null = null

async function getCsStores(): Promise<CsStore[]> {
    if (csStoresCache && Date.now() < csStoresExpiry) return csStoresCache
    try {
        const { data } = await csLimiter.schedule({ expiration: 5000 }, () =>
            axios.get<CsStore[]>("https://www.cheapshark.com/api/1.0/stores"),
        )
        csStoresCache = data
        csStoresExpiry = Date.now() + CS_STORES_TTL
        csIconMapCache = null   // invalidate icon map so it rebuilds from fresh stores
        return data
    } catch (err) {
        console.error("[CsStores] Failed to fetch stores list:", err instanceof Error ? err.message : String(err))
        return csStoresCache ?? []   // return stale cache rather than crashing
    }
}

/** Build a normalised-name → icon-URL map from CheapShark stores (for ITAD deals).
 *  Result is cached at module level and only rebuilt when the stores list refreshes. */
async function buildIconMap(): Promise<Map<string, string>> {
    if (csIconMapCache) return csIconMapCache
    const stores = await getCsStores()
    const map = new Map<string, string>()
    for (const s of stores) {
        const key = s.storeName.toLowerCase().replace(/[^a-z0-9]/g, "")
        map.set(key, `https://www.cheapshark.com${s.images.icon}`)
    }
    csIconMapCache = map
    return map
}

function resolveIcon(shopId: number | string, shopName: string, iconMap: Map<string, string>): string {
    // ITAD shop.id is a number — normalise to string for map lookup
    const normName = shopName.toLowerCase().replace(/[^a-z0-9]/g, "")
    return iconMap.get(normName) ?? ""
}

// ── ITAD (IsThereAnyDeal) ────────────────────────────────────────────────────

const ITAD_BASE = "https://api.isthereanydeal.com"

function itadHeaders(): Record<string, string> | null {
    const key = process.env.ITAD_API_KEY
    if (!key) return null
    return { "ITAD-API-Key": key }
}

// ITAD game ID cache — IDs are permanent, cache 7 days
const itadIdCache = new Map<string, { id: string | null; expiresAt: number }>()
const ITAD_ID_TTL = 7 * 24 * 60 * 60 * 1000

async function lookupItadId(steamAppId: string, gameTitle?: string): Promise<string | null> {
    const hit = itadIdCache.get(steamAppId)
    if (hit && hit.expiresAt > Date.now()) return hit.id
    const headers = itadHeaders()
    if (!headers) return null
    try {
        // Primary: appid lookup — most reliable, integer param required (ITAD skill: common mistake is passing string)
        const { data } = await axios.get(`${ITAD_BASE}/games/lookup/v1`, {
            params: { appid: Number(steamAppId) },
            headers,
            timeout: 8000,
        })
        if (data.found && data.game?.id) {
            const id = String(data.game.id)
            console.log(`[ITAD] ${steamAppId} → "${data.game.title}" (${id})`)
            itadIdCache.set(steamAppId, { id, expiresAt: Date.now() + ITAD_ID_TTL })
            return id
        }

        // Fallback: title lookup — covers re-released games (e.g. GTA V Enhanced, appid 3240220)
        // that ITAD hasn't yet indexed under the new Steam appid but does know by title.
        if (gameTitle) {
            console.log(`[ITAD] appid ${steamAppId} not found, retrying by title: "${gameTitle}"`)
            const { data: td } = await axios.get(`${ITAD_BASE}/games/lookup/v1`, {
                params: { title: gameTitle },
                headers,
                timeout: 8000,
            })
            if (td.found && td.game?.id) {
                const id = String(td.game.id)
                console.log(`[ITAD] title "${gameTitle}" → "${td.game.title}" (${id})`)
                itadIdCache.set(steamAppId, { id, expiresAt: Date.now() + ITAD_ID_TTL })
                return id
            }
        }

        console.log(`[ITAD] ${steamAppId} → not found`)
        itadIdCache.set(steamAppId, { id: null, expiresAt: Date.now() + ITAD_ID_TTL })
        return null
    } catch (err) {
        console.warn("[ITAD] lookupItadId failed for", steamAppId,
            err instanceof Error ? err.message : String(err))
        return null
    }
}

// ── Console edition search ────────────────────────────────────────────────────
// ITAD stores PC and console versions as separate game entries. To get Nintendo
// eShop / Xbox / PlayStation prices we search for edition entries (e.g.
// "Hollow Knight: Voidheart Edition") and merge their store deals into the PC list.

const ITAD_EDITION_CACHE = new Map<string, { ids: string[]; expiresAt: number }>()
const ITAD_EDITION_TTL = 6 * 60 * 60 * 1000  // 6 hours

const EDITION_KEYWORDS = ["edition", "enhanced", "remastered", "deluxe", "complete",
    "definitive", "ultimate", "collection", "bundle"]

/** Returns true only when `foundTitle` is a console/platform edition of `originalTitle`
 *  (e.g. "Hollow Knight: Voidheart Edition") and NOT a different game or sequel. */
function isConsoleEdition(foundTitle: string, originalTitle: string): boolean {
    const ft = foundTitle.toLowerCase()
    const ot = originalTitle.toLowerCase()
    if (!ft.startsWith(ot)) return false
    const suffix = ft.slice(ot.length).trim()
    if (!suffix) return false  // identical title — already have it
    return EDITION_KEYWORDS.some(kw => suffix.includes(kw))
}

async function findConsoleEditionIds(title: string, knownId: string): Promise<string[]> {
    const key = title.toLowerCase().trim()
    const hit = ITAD_EDITION_CACHE.get(key)
    if (hit && hit.expiresAt > Date.now()) return hit.ids
    const headers = itadHeaders()
    if (!headers) return []
    try {
        const { data } = await axios.get<{ id: string; title: string; type: string }[]>(
            `${ITAD_BASE}/games/search/v1`,
            { params: { title, results: 10 }, headers, timeout: 8000 },
        )
        const ids = (data ?? [])
            .filter(g => g.type === "game" && g.id !== knownId && isConsoleEdition(g.title, title))
            .map(g => {
                console.log(`[ITAD] console edition found: "${g.title}" (${g.id})`)
                return g.id
            })
        ITAD_EDITION_CACHE.set(key, { ids, expiresAt: Date.now() + ITAD_EDITION_TTL })
        return ids
    } catch (err) {
        console.warn("[ITAD] findConsoleEditionIds failed:", err instanceof Error ? err.message : String(err))
        return []
    }
}

// ─── Card Price (ITAD batch overview) ─────────────────────────────────────────

/** Structured price for home-page cards — includes discount percentage */
export interface CardPrice {
    price:   number   // current sale price (USD)
    regular: number   // regular (non-sale) price
    cut:     number   // 0–100 discount percentage
    isFree:  boolean  // true when price === 0 (free game)
}

// ITAD title → ITAD UUID cache (for games without a known Steam AppID)
const itadTitleCache = new Map<string, { id: string | null; expiresAt: number }>()
const ITAD_TITLE_TTL = 7 * 24 * 60 * 60 * 1000   // 7 days — IDs are permanent

/**
 * Generate name variants to try when an exact ITAD lookup fails.
 * RAWG names often differ from store names:
 *   "Grand Theft Auto IV"  →  ITAD has "Grand Theft Auto IV: The Complete Edition"
 *   "NieR:Automata"        →  ITAD has "NieR: Automata"
 * We try the base name (strip subtitle) and vice versa (add nothing — already tried).
 */
function nameVariants(title: string): string[] {
    const variants = new Set<string>()

    // Strip subtitle after ": " — "Game: Subtitle" → "Game"
    const colon = title.indexOf(': ')
    if (colon > 3) variants.add(title.slice(0, colon).trim())

    // Strip after " – " or " - "
    const dash = title.search(/ [–\-] /)
    if (dash > 3) variants.add(title.slice(0, dash).trim())

    // Remove common edition suffixes from the end
    const editionSuffixes = [
        / Definitive Edition$/i,
        / The Definitive Edition$/i,
        / Complete Edition$/i,
        / The Complete Edition$/i,
        / Remastered$/i,
        / HD Remaster$/i,
        / Enhanced Edition$/i,
        / Gold Edition$/i,
        / Game of the Year Edition$/i,
        / GOTY Edition$/i,
        / Anniversary Edition$/i,
        / Deluxe Edition$/i,
    ]
    for (const pat of editionSuffixes) {
        const stripped = title.replace(pat, '').trim()
        if (stripped !== title && stripped.length > 3) variants.add(stripped)
    }

    // Normalise spacing around colon (RAWG sometimes omits space: "NieR:Automata")
    if (title.includes(':') && !title.includes(': ')) {
        variants.add(title.replace(':', ': '))
    }
    // Reverse case — strip space after colon
    if (title.includes(': ')) {
        variants.add(title.replace(': ', ':'))
    }

    // Roman numeral ↔ digit swap at end of title ("Hitman 2" ↔ "Hitman II")
    const roman = digitToRoman(title)
    if (roman) variants.add(roman)
    const digit = romanToDigit(title)
    if (digit) variants.add(digit)

    // Ampersand ↔ "and" swap ("Tom & Jerry" ↔ "Tom and Jerry")
    const amp = ampersandVariant(title)
    if (amp) variants.add(amp)

    // Strip trademark/copyright symbols if present
    if (/[™®©℠]/.test(title)) variants.add(stripTrademarks(title).trim())

    // Strip diacritics if present ("Pokémon" → "Pokemon")
    const noAccent = stripDiacritics(title)
    if (noAccent !== title) variants.add(noAccent)

    return [...variants].filter(v => v !== title && v.length > 2)
}

/**
 * Look up an ITAD game UUID purely by title.
 *
 * @param releaseYear  Optional 4-digit year from RAWG `released` field.
 *   When provided, year-disambiguating variants ("Hitman (2016)", "Hitman 2016")
 *   are tried FIRST so that title-ambiguous games (multiple same-named releases
 *   across years) land on the correct entry instead of the first alphabetical hit.
 *   The year is also used as a Fuse tiebreaker when direct lookups fail.
 */
async function lookupItadIdByTitle(title: string, releaseYear?: number): Promise<string | null> {
    const key = title.toLowerCase().trim()
    const hit = itadTitleCache.get(key)
    if (hit && hit.expiresAt > Date.now()) return hit.id
    const headers = itadHeaders()
    if (!headers) return null

    // Build the variant list.
    // Year-disambiguating variants come FIRST so a direct lookup on
    // "Hitman (2016)" fires before the bare "Hitman" that would ambiguously
    // match "Hitman: Absolution". nameVariants (subtitle/edition stripping)
    // come last — least specific, highest false-positive risk.
    const yearVariants: string[] = releaseYear
        ? [`${title} (${releaseYear})`, `${title} ${releaseYear}`]
        : []
    const titlesToTry = [...yearVariants, title, ...nameVariants(title)]

    try {
        for (const t of titlesToTry) {
            // Step 1: direct title lookup
            const { data } = await axios.get(`${ITAD_BASE}/games/lookup/v1`, {
                params: { title: t },
                headers,
                timeout: 8000,
            })
            if (data?.found && data.game?.id) {
                const id = String(data.game.id)
                if (t !== title) console.log(`[ITAD] matched "${title}" via variant "${t}"`)
                itadTitleCache.set(key, { id, expiresAt: Date.now() + ITAD_TITLE_TTL })
                return id
            }

            // Step 2: search fallback with Fuse.js
            const { data: searchData } = await axios.get<{ id: string; title: string; type: string }[]>(
                `${ITAD_BASE}/games/search/v1`,
                { params: { title: t, results: 10 }, headers, timeout: 8000 },
            )
            const candidates = (searchData ?? []).filter(g => g.type === "game")
            if (candidates.length > 0) {
                const fuse = new Fuse(candidates, { keys: ["title"], threshold: 0.4, includeScore: true })
                const fuseResults = fuse.search(t)
                // Year tiebreaker: when the caller gave us a release year, prefer
                // any candidate whose ITAD title includes that year over one that
                // doesn't — even if the non-year candidate ranks first by score.
                // This disambiguates "Hitman (2016)" vs "Hitman: Absolution" when
                // ITAD search returns both at similar Fuse scores.
                const yearStr = releaseYear ? String(releaseYear) : null
                let match = fuseResults[0]
                if (yearStr && fuseResults.length > 1) {
                    const yearPref = fuseResults.find(r => r.item.title.includes(yearStr))
                    if (yearPref) match = yearPref
                }
                if (match) {
                    const id = String(match.item.id)
                    console.log(`[ITAD] search "${t}" → "${match.item.title}" (${id})${yearStr && match.item.title.includes(yearStr) ? " [year-matched]" : ""}`)
                    itadTitleCache.set(key, { id, expiresAt: Date.now() + ITAD_TITLE_TTL })
                    return id
                }
            }
        }

        console.warn(`[ITAD] lookup failed for "${title}" (tried ${titlesToTry.length} variant(s))`)
        itadTitleCache.set(key, { id: null, expiresAt: Date.now() + ITAD_TITLE_TTL })
        return null
    } catch (err) {
        console.warn(`[ITAD] lookup error for "${title}":`, err instanceof Error ? err.message : String(err))
        return null
    }
}

// ─── Card price cache (SWR) ──────────────────────────────────────────────────
// Entries carry `source` provenance so SWR can decide which entries can be
// served from cache directly vs which deserve a background refresh.
//
// Confidence ranking (high → low):
//   override       — KNOWN_STEAM_APPIDS hand-verified
//   steamAppId     — caller-supplied (game-page flow already resolved it)
//   resolverCache  — discovered via prior RAWG /games/:id, persisted to disk
//   titleLookup    — neither source had an appid; fell back to fuzzy title search
//
// TTL is selected per-entry based on confidence + result (see chooseCardTTL).
type CardCacheEntry = {
    cp:        CardPrice | null
    expiresAt: number
    source:    SteamAppIdSource
}
const cardPriceCache = new Map<number, CardCacheEntry>()

// SWR thresholds + per-source TTLs.
// STALE_THRESHOLD: when a cache entry has less than this much TTL left it gets
// a background refresh on read (the stale value is still returned immediately).
const STALE_THRESHOLD              = 5 * 60 * 1000        // refresh if < 5 min TTL remaining
const CARD_PRICE_TTL_FOUND         = 30 * 60 * 1000       // high-confidence found
const CARD_PRICE_TTL_TITLE_LOOKUP  = 10 * 60 * 1000       // fuzzy match — recycle faster
const CARD_PRICE_TTL_NULL          = 5 * 60 * 1000        // null — try to recover quickly
function chooseCardTTL(cp: CardPrice | null, source: SteamAppIdSource): number {
    if (cp === null) return CARD_PRICE_TTL_NULL
    if (source === 'titleLookup') return CARD_PRICE_TTL_TITLE_LOOKUP
    return CARD_PRICE_TTL_FOUND
}
function isHighConfidence(source: SteamAppIdSource): boolean {
    return source === 'override' || source === 'steamAppId' || source === 'resolverCache'
}

/**
 * Free-to-play overrides — games whose store entry has been renamed/merged so
 * CheapShark's title search can't reach them confidently from the RAWG name.
 * Keys are normalised RAWG titles (lowercase, alphanumerics + spaces).
 * Per skill rule "no fuzzy match without proof" — list only games we have
 * verified are genuinely free RIGHT NOW on Steam (or another major store).
 */
/**
 * Known Steam AppID overrides — keyed by RAWG game id.
 *
 * Purpose: home-page cards never receive a steamAppId (the RAWG list endpoint
 * doesn't return store data), so every card falls back to title matching.
 * For games with ambiguous or unreliable title matches, hard-code the verified
 * Steam AppID so the card hits the exact same ITAD entry as the game page.
 *
 * How to add a game:
 *   1. Visit the Steam store page → AppID is in the URL: /app/{APPID}/
 *   2. Visit https://rawg.io/games/{slug} → RAWG ID is in page source / API
 *   3. Add `rawgId: "steamAppId"` below with a short comment
 *
 * Only add games where (a) title matching is provably wrong AND (b) the Steam
 * SKU is the canonical/intended version of the game.
 */
const KNOWN_STEAM_APPIDS: Record<number, string> = {
    28:    "12210",    // Grand Theft Auto IV (Complete Edition is the only Steam SKU)
    23583: "236870",   // Hitman (2016) — disambiguates from Absolution, Blood Money, etc.
    28667: "203160",   // Tomb Raider (2013 reboot) — many "Tomb Raider" titles exist
    11859: "524220",   // NieR:Automata — colon/punctuation makes title matching unreliable
    58175: "1593500",  // God of War (2018, PC port 2022) — RAWG/Steam release-year mismatch
    2454:  "379720",   // DOOM (2016) — disambiguates from original 1993 DOOM
}

const KNOWN_FREE_TITLES = new Set<string>([
    "counter strike global offensive", // renamed to "Counter-Strike 2" — still free
    "counter strike 2",
    "dota 2",
    "team fortress 2",
    "warframe",
    "apex legends",
    "fortnite",
    "path of exile",
    "destiny 2",
    "war thunder",
    "world of tanks",
    "smite",
    "paladins",
    "brawlhalla",
])

const FREE_CARD_PRICE: CardPrice = { price: 0, regular: 0, cut: 100, isFree: true }

/**
 * CheapShark price peer — independent of ITAD per Cardinal Rule #1.
 * Searches CheapShark for `name`, validates the candidate with the same
 * exact → prefix → acronym matcher used in getGameDealsService Path B
 * (deliberately strict — Fuse fallback only on a tight 0.30 threshold so we
 * never mark the wrong game as free or paid). Returns ANY price, not just Free.
 *
 * Returns:
 *   CardPrice with isFree=true   → matched, cheapest is 0.00
 *   CardPrice with isFree=false  → matched, paid price
 *   null                         → no confident match OR transient error
 */
async function checkCheapSharkPrice(name: string): Promise<CardPrice | null> {
    try {
        const { data } = await csLimiter.schedule({ expiration: 3000 }, () =>
            axios.get<CsGameCandidate[]>(
                "https://www.cheapshark.com/api/1.0/games",
                { params: { title: name, limit: 10 }, timeout: 6000 },
            ),
        )
        if (!Array.isArray(data) || data.length === 0) {
            console.log(`[CheapShark] price-check "${name}" — no results`)
            return null
        }

        const norm = normTitle(name)
        const MIN_PREFIX = 5

        // Level 1 — exact normalised match
        let best: CsGameCandidate | undefined = data.find(g => normTitle(g.external) === norm)

        // Level 2 — prefix match on word boundary (candidate is longer)
        if (!best) best = data.find(g => {
            const t = normTitle(g.external)
            if (norm.length < MIN_PREFIX || t.length < MIN_PREFIX) return false
            return t.startsWith(norm) && (t.length === norm.length || t[norm.length] === " ")
        })

        // Level 3 — bidirectional acronym match (GTA V ↔ Grand Theft Auto V)
        if (!best) best = data.find(g => acronymMatch(name, g.external))

        // Level 4 — Fuse fallback at tight threshold (0.30), only when nothing else hit.
        // Stricter than the 0.35 baseline because here a wrong match writes a wrong
        // PRICE onto the card, not just a wrong store link.
        if (!best) {
            const fuse = new Fuse(data, { keys: ["external"], includeScore: true, threshold: 0.30 })
            const hit = fuse.search(name)[0]
            if (hit && typeof hit.score === "number" && hit.score < 0.30) best = hit.item
        }

        if (!best || best.cheapest == null) {
            console.log(`[CheapShark] price-check "${name}" — no confident match (got: ${data.map(g => g.external).join(", ")})`)
            return null
        }

        const cheapest = parseFloat(best.cheapest)
        if (!Number.isFinite(cheapest)) {
            console.log(`[CheapShark] price-check "${name}" — matched "${best.external}" but cheapest unparsable: ${best.cheapest}`)
            return null
        }

        const isFree = cheapest === 0
        console.log(`[CheapShark] price-check "${name}" → "${best.external}" ${isFree ? "FREE" : `$${best.cheapest}`}`)
        return isFree
            ? FREE_CARD_PRICE
            : { price: cheapest, regular: cheapest, cut: 0, isFree: false }
    } catch (err) {
        // Re-throw axios errors so the caller can distinguish "transient failure"
        // from "confidently no match" and skip caching wrong/missing data.
        // BSExpired (bottleneck queue timeout) is also transient — re-throw it.
        console.warn(`[CheapShark] price-check "${name}" failed:`, err instanceof Error ? err.message : String(err))
        throw err
    }
}

/**
 * Batch-fetch ITAD prices for home-page game cards.
 * For each game: resolves ITAD UUID (via Steam AppID or title), then calls
 * POST /games/overview/v2 in batches of 20 to get the best current price.
 * Results are cached in-memory for 30 minutes.
 *
 * Returns { [gameId]: CardPrice | null } — null means not found on any tracked store.
 */
export async function getCardPricesService(
    games: Array<{ id: number; name: string; steamAppId?: string; released?: string }>,
): Promise<Record<number, CardPrice | null>> {
    const headers = itadHeaders()
    const result: Record<number, CardPrice | null> = {}

    // 0a. Seed steamAppId from the cascade (synchronous tiers only):
    //     1) KNOWN_STEAM_APPIDS (hand-verified override)
    //     2) caller-supplied g.steamAppId
    //     3) resolverCache hit (populated by prior detail-page visits / SWR fallthrough)
    //
    //     The cascade's RAWG /games/:id fallback (tier 4) is NOT fired here —
    //     it's reserved for the must_fetch_blocking branch below so we don't
    //     burn an extra RAWG call per cached game.
    games = games.map(g => {
        if (g.steamAppId) return g
        const overrideAppid = KNOWN_STEAM_APPIDS[g.id]
        if (overrideAppid) return { ...g, steamAppId: overrideAppid }
        const cached = resolverCache.get(g.id)
        if (cached && cached.expiresAt > Date.now() && cached.appid) {
            return { ...g, steamAppId: cached.appid }
        }
        return g
    })

    // 0b. Known free-to-play override — catches games whose store entry has been
    //     renamed/merged (e.g. CSGO → Counter-Strike 2) so the regular pipeline
    //     can't reach them. Applied to games without a steamAppId; when a Steam
    //     AppID is present, Steam Direct + ITAD will resolve correctly anyway.
    const overrideGames = new Set<number>()
    for (const g of games) {
        if (!g.steamAppId && KNOWN_FREE_TITLES.has(normTitle(g.name))) {
            result[g.id] = FREE_CARD_PRICE
            cardPriceCache.set(g.id, {
                cp:        FREE_CARD_PRICE,
                expiresAt: Date.now() + CARD_PRICE_TTL_FOUND,
                source:    'override',
            })
            overrideGames.add(g.id)
        }
    }

    // ── 1. SWR classification ────────────────────────────────────────────────
    // For each game, decide:
    //   serve_cache_only      cache is fresh + high-confidence + non-null → use as-is
    //   serve_and_refresh     cache exists but is stale OR null OR low-confidence
    //                          → return cached value immediately, refresh in background
    //   must_fetch_blocking   no cache → block until first fetch lands
    const mustFetch:        typeof games = []
    const refreshInBackground: typeof games = []

    for (const g of games) {
        if (overrideGames.has(g.id)) continue
        const hit = cardPriceCache.get(g.id)
        if (!hit || hit.expiresAt <= Date.now()) {
            mustFetch.push(g)
            continue
        }
        const remaining = hit.expiresAt - Date.now()
        const fresh     = remaining > STALE_THRESHOLD
        const trusted   = hit.cp !== null && isHighConfidence(hit.source)
        if (fresh && trusted) {
            result[g.id] = hit.cp     // serve_cache_only
        } else {
            result[g.id] = hit.cp     // serve_and_refresh — return stale instantly
            refreshInBackground.push(g)
        }
    }

    // ── 2. Blocking fetch for cache-miss games ──────────────────────────────
    if (mustFetch.length > 0) {
        const fetched = await fetchPriceForGames(mustFetch, headers, 'blocking')
        for (const [id, cp] of fetched) result[id] = cp
    }

    // ── 3. Background refresh for stale/low-confidence entries ──────────────
    // Fire-and-forget. The next request to hit cardPriceCache sees the new value.
    if (refreshInBackground.length > 0) {
        // Cap to keep API budget bounded — overflow stays on stale cache until next render.
        const REFRESH_LIMIT = 15
        const toRefresh = refreshInBackground.slice(0, REFRESH_LIMIT)
        void fetchPriceForGames(toRefresh, headers, 'background').catch(err =>
            console.warn("[CardPrice] background refresh failed:",
                err instanceof Error ? err.message : String(err)),
        )
    }

    return result
}

/**
 * Full price fetch for a batch of games:
 *   1. Resolve each game's steamAppId via the cascade (skips RAWG tier on background mode)
 *   2. Run ITAD + CheapShark in TRUE parallel (Cardinal Rule #1 — peers, not chained)
 *   3. Merge per-game with mergeCardPrices (Free wins, otherwise min)
 *   4. Write cache with provenance + per-source TTL
 *
 * `mode`:
 *   'blocking'   — user is waiting; cascade includes RAWG /games/:id fallback
 *                   to maximise chance of an exact steamAppId match
 *   'background' — fire-and-forget refresh; cascade uses ONLY synchronous tiers
 *                   to keep the refresh cheap (one extra RAWG call per stale
 *                   card would multiply traffic)
 */
async function fetchPriceForGames(
    games: Array<{ id: number; name: string; steamAppId?: string; released?: string }>,
    headers: Record<string, string> | null,
    mode: 'blocking' | 'background',
): Promise<Map<number, CardPrice | null>> {
    // Per-game appid resolution with source tracking
    const resolved = await Promise.all(games.map(async g => {
        if (mode === 'background') {
            // Sync tiers only — no RAWG fallback to avoid burning API budget
            if (g.steamAppId) return { ...g, _source: 'steamAppId' as SteamAppIdSource }
            const override = KNOWN_STEAM_APPIDS[g.id]
            if (override) return { ...g, steamAppId: override, _source: 'override' as SteamAppIdSource }
            const cached = resolverCache.get(g.id)
            if (cached && cached.expiresAt > Date.now() && cached.appid) {
                return { ...g, steamAppId: cached.appid, _source: 'resolverCache' as SteamAppIdSource }
            }
            return { ...g, _source: 'titleLookup' as SteamAppIdSource }
        }
        // Blocking mode: full cascade, including RAWG fallback (writes to resolver cache)
        const { appid, source } = await resolveSteamAppIdCascade(g)
        return { ...g, steamAppId: appid, _source: source }
    }))

    // True parallel — ITAD and CheapShark as peers
    const [itadMap, csMap] = await Promise.all([
        headers ? runItadCardPipeline(resolved, headers) : Promise.resolve(new Map<number, CardPrice>()),
        runCheapSharkPipelineAll(resolved),
    ])

    const out = new Map<number, CardPrice | null>()
    for (const g of resolved) {
        const merged = mergeCardPrices(itadMap.get(g.id), csMap.get(g.id))
        const ttl    = chooseCardTTL(merged, g._source)
        cardPriceCache.set(g.id, {
            cp:        merged,
            expiresAt: Date.now() + ttl,
            source:    g._source,
        })
        out.set(g.id, merged)
    }
    return out
}

/**
 * Merge prices from ITAD and CheapShark into one CardPrice per the skill's
 * Cardinal Rules:
 *   - Free wins: if either source reports isFree, return Free
 *   - Otherwise return the lower of the two paid prices
 *   - If only one source returned a price, return that
 *   - If neither returned a price, return null (Unknown)
 */
function mergeCardPrices(
    itad: CardPrice | undefined,
    cs:   CardPrice | undefined,
): CardPrice | null {
    if (!itad && !cs) return null
    if (itad?.isFree || cs?.isFree) return FREE_CARD_PRICE
    if (itad && cs) return itad.price <= cs.price ? itad : cs
    return (itad ?? cs)!
}

/**
 * ITAD card-price pipeline:
 *   1. Resolve each game's ITAD UUID (via steamAppId or title lookup, in batches of 5)
 *   2. POST /games/prices/v3 in batches of 20 — pick lowest deal per game
 *
 * Returns Map<gameId, CardPrice> for games where ITAD returned at least one deal.
 * Games with no ITAD match are simply absent from the map (no entry, not null).
 */
async function runItadCardPipeline(
    games: Array<{ id: number; name: string; steamAppId?: string; released?: string }>,
    headers: Record<string, string>,
): Promise<Map<number, CardPrice>> {
    const out = new Map<number, CardPrice>()
    if (games.length === 0) return out

    // Resolve UUIDs in parallel (batches of 5 to be gentle on lookup API)
    const gameToItadId = new Map<number, string>()
    for (let i = 0; i < games.length; i += 5) {
        const batch = games.slice(i, i + 5)
        const resolved = await Promise.all(batch.map(async g => {
            const releaseYear = g.released ? parseInt(g.released.slice(0, 4), 10) || undefined : undefined
            const id = g.steamAppId
                ? await lookupItadId(g.steamAppId, g.name)
                : await lookupItadIdByTitle(g.name, releaseYear)
            return { gameId: g.id, itadId: id }
        }))
        for (const { gameId, itadId } of resolved) {
            if (itadId) gameToItadId.set(gameId, itadId)
        }
        if (i + 5 < games.length) await new Promise(r => setTimeout(r, 200))
    }

    if (gameToItadId.size === 0) return out

    // Reverse map: ITAD UUID → game IDs (multiple games can share an ITAD entry)
    const itadIdToGameIds = new Map<string, number[]>()
    for (const [gameId, itadId] of gameToItadId) {
        const list = itadIdToGameIds.get(itadId) ?? []
        list.push(gameId)
        itadIdToGameIds.set(itadId, list)
    }

    const uniqueItadIds = [...itadIdToGameIds.keys()]
    const BATCH = 20
    const overviewMap = new Map<string, CardPrice>()

    for (let i = 0; i < uniqueItadIds.length; i += BATCH) {
        const batch = uniqueItadIds.slice(i, i + BATCH)
        try {
            const { data } = await axios.post<{ id: string; deals: ItadRawDeal[] }[]>(
                `${ITAD_BASE}/games/prices/v3`,
                batch,
                {
                    params:  { country: "US" },
                    headers: { ...headers, "Content-Type": "application/json" },
                    timeout: 15000,
                },
            )
            if (!Array.isArray(data)) {
                console.warn("[CardPrice] prices/v3 unexpected shape:", JSON.stringify(data).slice(0, 200))
                continue
            }
            for (const entry of data) {
                if (!entry?.deals?.length) continue
                // Pick the deal with the lowest current price
                const best = entry.deals.reduce((a, b) =>
                    a.price.amount <= b.price.amount ? a : b
                )
                const price   = best.price.amount
                const regular = best.regular.amount
                overviewMap.set(entry.id, {
                    price,
                    regular,
                    cut:    best.cut ?? 0,
                    isFree: price === 0,
                })
            }
        } catch (err) {
            console.warn("[CardPrice] prices/v3 batch failed:",
                err instanceof Error ? err.message : String(err))
        }
        if (i + BATCH < uniqueItadIds.length) await new Promise(r => setTimeout(r, 300))
    }

    for (const [itadId, gameIds] of itadIdToGameIds) {
        const cp = overviewMap.get(itadId)
        if (!cp) continue
        for (const gameId of gameIds) out.set(gameId, cp)
    }
    return out
}

/**
 * CheapShark card-price pipeline — runs CheapShark per game.
 *
 * When a game has a verified `steamAppId` (via override/cascade/resolverCache),
 * uses the exact `/deals?steamAppID=XYZ` endpoint instead of fuzzy title search.
 * Falls back to title-search for games with no resolved appid.
 *
 * Both paths go through `csLimiter` (bottleneck handles concurrency + pacing).
 * Capped at CS_CARD_LIMIT so a single page render can't burn the entire budget.
 */
const CS_CARD_LIMIT = 15
async function runCheapSharkPipelineAll(
    games: Array<{ id: number; name: string; steamAppId?: string }>,
): Promise<Map<number, CardPrice>> {
    const out = new Map<number, CardPrice>()
    if (games.length === 0) return out

    const toCheck = games.slice(0, CS_CARD_LIMIT)
    for (const g of toCheck) {
        try {
            const cp = g.steamAppId
                ? await checkCheapSharkPriceByAppId(g.steamAppId, g.name)
                : await checkCheapSharkPrice(g.name)
            if (cp) out.set(g.id, cp)
        } catch {
            // Transient error (BSExpired queue-timeout, axios 429, network) —
            // skip this game silently; SWR will retry on next render's stale check.
        }
    }
    return out
}

/**
 * Exact-match CheapShark price lookup by Steam AppID.
 * Uses `/deals?steamAppID=XYZ` which always returns deals for THE EXACT game —
 * no title fuzziness possible. Picks the cheapest deal across all stores
 * CheapShark indexes for that appid.
 *
 * Free detection: salePrice "0.00" → FREE_CARD_PRICE.
 *
 * Returns null when CheapShark has no deals for the appid (game not tracked).
 * Throws on transient errors (queue timeout, network) so caller skips updating
 * any "checked" state — same convention as `checkCheapSharkPrice`.
 */
async function checkCheapSharkPriceByAppId(
    steamAppId: string,
    nameForLog: string,
): Promise<CardPrice | null> {
    try {
        const { data } = await csLimiter.schedule({ expiration: 3000 }, () =>
            axios.get<CsDeal[]>("https://www.cheapshark.com/api/1.0/deals", {
                params: { steamAppID: steamAppId, sortBy: "Price", pageSize: 10 },
                timeout: 6000,
            }),
        )
        if (!Array.isArray(data) || data.length === 0) {
            console.log(`[CheapShark] appid-check "${nameForLog}" (${steamAppId}) — no deals`)
            return null
        }
        const cheapest = data.reduce((a, b) =>
            parseFloat(a.salePrice) <= parseFloat(b.salePrice) ? a : b
        )
        const sale     = parseFloat(cheapest.salePrice)
        const regular  = parseFloat(cheapest.normalPrice)
        const savings  = parseFloat(cheapest.savings)
        if (!Number.isFinite(sale)) {
            console.log(`[CheapShark] appid-check "${nameForLog}" (${steamAppId}) — unparsable salePrice`)
            return null
        }
        const isFree = sale === 0
        console.log(`[CheapShark] appid-check "${nameForLog}" (${steamAppId}) → ${isFree ? "FREE" : `$${cheapest.salePrice}`}`)
        return isFree
            ? FREE_CARD_PRICE
            : { price: sale, regular, cut: Math.round(savings), isFree: false }
    } catch (err) {
        console.warn(`[CheapShark] appid-check "${nameForLog}" (${steamAppId}) failed:`,
            err instanceof Error ? err.message : String(err))
        throw err
    }
}

async function fetchItadDeals(itadId: string): Promise<ItadRawDeal[]> {
    const headers = itadHeaders()
    if (!headers) return []
    try {
        const { data } = await axios.post<{ id: string; deals: ItadRawDeal[] }[]>(
            `${ITAD_BASE}/games/prices/v3`,
            [itadId],
            {
                params: { country: "US" },
                headers,
            },
        )
        if (!Array.isArray(data) || !data[0]?.deals) return []
        return data[0].deals as ItadRawDeal[]
    } catch {
        return []
    }
}

// ── Shared types ──────────────────────────────────────────────────────────────

export interface DealResult {
    storeID: string
    storeName: string
    storeIcon: string
    salePrice: string
    normalPrice: string
    savings: number
    dealID: string
    dealLink: string
    /** Set when this row represents a DLC discount rather than the base game. */
    dlcName?: string
}

const dealsCache = new Map<string, { deals: DealResult[]; expiresAt: number }>()
const DEALS_TTL = 30 * 60 * 1000

// ─── Steam Direct Price ───────────────────────────────────────────────────────
// Uses the free public Steam Store API — no API key required.
// Always returns the correct price and a direct link to the game's Steam page.

interface SteamPriceOverview {
    currency: string
    initial: number   // price in cents (e.g. 999 = $9.99)
    final: number
    discount_percent: number
    initial_formatted: string
    final_formatted: string
}

interface SteamDetailsEntry {
    success: boolean
    data?: { is_free: boolean; price_overview?: SteamPriceOverview }
}

const steamPriceCache = new Map<string, { deal: DealResult | null; expiresAt: number }>()
const STEAM_PRICE_TTL = 15 * 60 * 1000  // 15 minutes

const STEAM_ICON = "https://www.cheapshark.com/img/stores/icons/0.png"

/**
 * Fetches the current price for a Steam game directly from Steam's storefront API.
 * No key needed. Returns a single DealResult with a guaranteed-correct store link,
 * or null when the game has no price (coming soon / region-restricted / not found).
 */
export async function getSteamDirectPrice(steamAppId: string): Promise<DealResult | null> {
    const hit = steamPriceCache.get(steamAppId)
    if (hit && hit.expiresAt > Date.now()) return hit.deal

    const save = (deal: DealResult | null) => {
        steamPriceCache.set(steamAppId, { deal, expiresAt: Date.now() + STEAM_PRICE_TTL })
        return deal
    }

    try {
        const { data } = await axios.get<Record<string, SteamDetailsEntry>>(
            "https://store.steampowered.com/api/appdetails",
            {
                params: { appids: steamAppId, cc: "us", filters: "price_overview,is_free" },
                timeout: 8000,
            },
        )

        const entry = data[steamAppId]
        if (!entry?.success || !entry.data) return save(null)

        const storeLink = `https://store.steampowered.com/app/${steamAppId}/`

        // Free games — is_free flag
        if (entry.data.is_free) {
            return save({
                storeID: "steam",
                storeName: "Steam",
                storeIcon: STEAM_ICON,
                salePrice: "0.00",
                normalPrice: "0.00",
                savings: 0,
                dealID: steamAppId,
                dealLink: storeLink,
            })
        }

        const po = entry.data.price_overview
        if (!po) return save(null)   // coming soon, or not available in US

        return save({
            storeID: "steam",
            storeName: "Steam",
            storeIcon: STEAM_ICON,
            salePrice: (po.final / 100).toFixed(2),
            normalPrice: (po.initial / 100).toFixed(2),
            savings: po.discount_percent,
            dealID: steamAppId,
            dealLink: storeLink,
        })
    } catch (err) {
        console.warn(
            "[Steam] Direct price fetch failed for appid", steamAppId, ":",
            err instanceof Error ? err.message : String(err),
        )
        return save(null)
    }
}

// ── Title matching helpers ────────────────────────────────────────────────────

/** Strip diacritics — "Pokémon" → "Pokemon", "Café" → "Cafe" */
const stripDiacritics = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "")

/** Strip trademark/copyright symbols — "NieR:Automata™" → "NieR:Automata" */
const stripTrademarks = (s: string) => s.replace(/[™®©℠]/g, "")

/**
 * Canonical title form used for matching:
 *   - strip diacritics ("Pokémon" → "Pokemon")
 *   - strip trademarks (™®©)
 *   - lowercase
 *   - replace punctuation with spaces
 *   - collapse runs of whitespace
 *   - normalize roman numerals → digits ("Blasphemous II" ↔ "Blasphemous 2")
 *
 * The roman→digit step happens LAST so both forms collapse to the same string
 * regardless of which one we started with. Result: Level-1 exact-match in the
 * CheapShark price matcher works for either casing/numeral form.
 */
const normTitle = (s: string) =>
    romanToDigits(
        stripTrademarks(stripDiacritics(s))
            .toLowerCase()
            .replace(/[^a-z0-9 ]/g, " ")
            .replace(/\s+/g, " ")
            .trim()
    )

// ─── Roman numeral ↔ digit conversion ────────────────────────────────────────
// Many series are titled with EITHER form depending on the database:
//   "Blasphemous II" (Steam) vs "Blasphemous 2" (CheapShark/some stores)
//   "Final Fantasy VII Remake" vs "Final Fantasy 7 Remake"
//   "Hitman 2" (Steam) vs "Hitman II" (older listings)
//
// Approach (two-pronged so both QUERY and MATCHING work):
//   1. `romanToDigits` / `digitsToRomans` are applied INSIDE normTitle so all
//      comparisons treat the two forms as identical (Level-1 exact match wins
//      for either side without needing a fuzzy fallback).
//   2. `nameVariants` generates a swapped-form variant SO the literal query
//      sent to ITAD/CheapShark also has a chance to hit a record stored under
//      the other form (when the API does exact-string matching server-side).
//
// Position: anywhere in the title, not just the end. Matches at \b word
// boundaries so we don't accidentally rewrite "Civilization" or "video".

const ROMAN_VALUES: Record<string, string> = {
    II: "2", III: "3", IV: "4",
    VI: "6", VII: "7", VIII: "8", IX: "9", X: "10",
}
// Standalone roman numeral at word boundaries. Order matters: longer alternatives
// FIRST so "VIII" wins over "II" when both could match the prefix.
//
// Deliberately EXCLUDED: bare "I" (pronoun ambiguity — "I Am Setsuna") and bare
// "V" (single-letter ambiguity — "V for Vendetta"). The cost of including them
// is wrong variants getting sent to the API (wasted calls), not wrong matches —
// but skipping the rare numeral cases is the cheaper trade-off.
//
// Case-insensitive flag — normTitle lowercases before applying this regex.
const ROMAN_PATTERN = /\b(VIII|VII|VI|IV|IX|III|II|X)\b/gi
// Standalone digit 2–10 at word boundaries. Skip 1 (rarely standalone in game titles).
const DIGIT_PATTERN = /\b(10|2|3|4|5|6|7|8|9)\b/g
const DIGIT_TO_ROMAN_MAP: Record<string, string> = {
    "2": "II", "3": "III", "4": "IV", "6": "VI",
    "7": "VII", "8": "VIII", "9": "IX", "10": "X",
    // 5 excluded — round-trips would map "5" → "V" which collides with bare-V exclusion above
}

/** Convert every standalone roman numeral (I, II, … X) to its digit equivalent. */
function romanToDigits(s: string): string {
    return s.replace(ROMAN_PATTERN, m => ROMAN_VALUES[m.toUpperCase()] ?? m)
}

/** Convert every standalone digit (2..10) to its roman-numeral equivalent. */
function digitsToRomans(s: string): string {
    return s.replace(DIGIT_PATTERN, m => DIGIT_TO_ROMAN_MAP[m] ?? m)
}

/** Returns the title with all standalone romans replaced by digits, or null
 *  when nothing changed. Used by `nameVariants` to generate query variants. */
function romanToDigit(title: string): string | null {
    const swapped = romanToDigits(title)
    return swapped !== title ? swapped : null
}

/** Returns the title with all standalone digits (2..10) replaced by roman
 *  numerals, or null when nothing changed. */
function digitToRoman(title: string): string | null {
    const swapped = digitsToRomans(title)
    return swapped !== title ? swapped : null
}

/** "Tom & Jerry" → "Tom and Jerry" and vice versa */
function ampersandVariant(title: string): string | null {
    if (title.includes(" & ")) return title.replace(/ & /g, " and ")
    if (/ and /i.test(title)) return title.replace(/ and /gi, " & ")
    return null
}

/**
 * Edition keywords — words that legitimately mark a different release of THE SAME GAME
 * (not a sequel, spinoff, or bundle). Used to decide when a longer/shorter CheapShark
 * title is acceptable as a match for our base title.
 *
 * Excludes: "trilogy", "collection", "bundle" — these are multi-game packs, not editions.
 */
const EDITION_FIRST_WORDS = new Set<string>([
    "edition", "enhanced", "remastered", "remaster", "remake",
    "deluxe", "complete", "definitive", "ultimate",
    "hd", "goty", "anniversary", "platinum", "gold",
    "classic", "classics", "legacy", "redux", "directors",
])

/**
 * Returns the first meaningful word of a suffix after stripping leading
 * separators ("–", "-", ":") and articles ("the"). Empty string when none.
 *
 *   " – the definitive edition" → "definitive"
 *   " complete edition"         → "complete"
 *   " san andreas"              → "san"
 */
function suffixFirstWord(suffix: string): string {
    const cleaned = suffix
        .toLowerCase()
        .replace(/^[\s\-–—:]+/, "")   // strip leading separators
        .replace(/^the\s+/, "")       // strip leading "the "
        .trim()
    if (!cleaned) return ""
    return cleaned.split(/\s+/)[0] ?? ""
}

/**
 * True when `candidate` and `base` are the same game — either an exact match
 * after normalisation, or one is a prefix of the other with the remaining suffix
 * being an edition/remaster marker.
 *
 * Bidirectional, so:
 *   ("Grand Theft Auto: Vice City",
 *    "Grand Theft Auto: Vice City – The Definitive Edition")  → true
 *   ("Hollow Knight Voidheart Edition",
 *    "Hollow Knight")                                          → true
 *   ("Grand Theft Auto: Vice City",
 *    "Grand Theft Auto: San Andreas")                          → false ("san" not edition)
 *   ("Grand Theft Auto",
 *    "Grand Theft Auto: The Trilogy")                          → false ("trilogy" excluded)
 */
function isEditionVariant(candidate: string, base: string): boolean {
    const c = normTitle(candidate)
    const b = normTitle(base)
    if (!c || !b) return false
    if (c === b) return true

    // Determine which is the prefix of which (with word boundary)
    let longer: string, shorter: string
    if (c.startsWith(b) && (c.length === b.length || c[b.length] === " ")) {
        longer = c; shorter = b
    } else if (b.startsWith(c) && (b.length === c.length || b[c.length] === " ")) {
        longer = b; shorter = c
    } else {
        return false
    }

    const suffix = longer.slice(shorter.length).trim()
    if (!suffix) return true   // identical after norm

    // Minimum length guard — prevents 1–2 letter prefixes accidentally matching
    if (shorter.length < 5) return false

    const firstWord = suffixFirstWord(suffix)
    return EDITION_FIRST_WORDS.has(firstWord)
}

/** Articles/prepositions to skip when generating acronyms */
const SKIP_WORDS = new Set(["the", "a", "an", "of", "in", "for", "and", "or", "to"])

/**
 * Generate acronym from title first letters (skipping common words).
 * "Grand Theft Auto V" → "gtav"
 * "Breath of the Wild" → "btw"  (skip "of", "the")
 */
function toAcronym(title: string): string {
    return normTitle(title)
        .split(" ")
        .filter(w => w.length > 0 && !SKIP_WORDS.has(w))
        .map(w => w[0])
        .join("")
}

/**
 * Bidirectional acronym match — handles abbreviations like GTA ↔ Grand Theft Auto V.
 *
 * Checks two cases:
 *   1. acronym(candidate) === normTitle(search).noSpaces   → "gtav" === "gtav"
 *   2. acronym(search)    === normTitle(candidate).noSpaces → reverse
 *
 * The third case (acroS === acroC) was intentionally removed: it caused false-positive
 * collisions when two unrelated games share the same acronym (e.g. "Grand Theft Arcade"
 * and "Grand Theft Auto" both produce "GTA"), returning the wrong game's deals.
 */
function acronymMatch(search: string, candidate: string): boolean {
    const normS = normTitle(search).replace(/\s/g, "")
    const normC = normTitle(candidate).replace(/\s/g, "")
    const acroS = toAcronym(search)
    const acroC = toAcronym(candidate)
    return acroC === normS || acroS === normC
}

// ── Deal-link terminal logger ─────────────────────────────────────────────────
/** Prints a formatted deal table to the backend terminal every time a game page loads. */
function logDealsToTerminal(title: string, deals: DealResult[]): void {
    if (deals.length === 0) {
        console.log(`[Deals] "${title}" — no deals found`)
        return
    }
    console.log(`[Deals] "${title}" — ${deals.length} deal(s)`)
    for (const d of deals) {
        const price  = d.salePrice === "N/A" || d.salePrice === "0.00"
            ? d.salePrice
            : `$${d.salePrice}`
        const saving = typeof d.savings === "number"
            ? `(${Math.round(d.savings)}% off)`
            : "(N/A)"
        const store  = d.storeName.padEnd(16)
        console.log(`  • ${store} ${price.padEnd(9)} ${saving.padEnd(13)} → ${d.dealLink}`)
    }
}

// ── Main service ──────────────────────────────────────────────────────────────

/**
 * Returns all current store deals for a game.
 *
 * Priority:
 *   1. ITAD via Steam AppID → exact game, exact price, direct store URL
 *  1.5 ITAD via title lookup (year-aware) → for games where RAWG didn't return
 *       a Steam store entry but ITAD still tracks the title (new/non-Steam games)
 *   2. CheapShark title search → exact → edition-variant → acronym
 *   3. Empty list — never returns wrong game's deals
 */
export const getGameDealsService = async (
    title: string,
    steamAppId?: string,
    releaseYear?: number,
): Promise<DealResult[]> => {
    const cacheKey = steamAppId ? `steam:${steamAppId}` : `title:${title.toLowerCase().trim()}${releaseYear ? `:${releaseYear}` : ""}`
    const cached = dealsCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
        console.log(`[Cache] serving "${title}" from cache`)
        return cached.deals
    }

    const save = (deals: DealResult[]) => {
        dealsCache.set(cacheKey, { deals, expiresAt: Date.now() + DEALS_TTL })
        logDealsToTerminal(title, deals)
        return deals
    }

    // ── Path A: ITAD via Steam AppID ─────────────────────────────────────────
    if (steamAppId) {
        try {
            const itadId = await lookupItadId(steamAppId, title)
            if (itadId) {
                const [rawDeals, iconMap] = await Promise.all([
                    fetchItadDeals(itadId),
                    buildIconMap(),
                ])
                if (rawDeals.length > 0) {
                    let deals: DealResult[] = rawDeals
                        .map(d => ({
                            storeID: String(d.shop.id),   // ITAD shop.id is a number; DealResult.storeID is string
                            storeName: d.shop.name,
                            storeIcon: resolveIcon(d.shop.id, d.shop.name, iconMap),
                            salePrice: d.price.amount.toFixed(2),
                            normalPrice: d.regular.amount.toFixed(2),
                            savings: d.cut,
                            dealID: itadId,
                            dealLink: d.url,
                        }))
                        .sort((a, b) => {
                            // Steam always first; rest sorted cheapest-first
                            const isSteamA = a.storeName.toLowerCase() === "steam" || a.storeID === "61"
                            const isSteamB = b.storeName.toLowerCase() === "steam" || b.storeID === "61"
                            if (isSteamA) return -1
                            if (isSteamB) return 1
                            return parseFloat(a.salePrice) - parseFloat(b.salePrice)
                        })

                    // Enrich with IGDB-sourced GOG/Epic deals (runs in background, non-blocking)
                    if (process.env.IGDB_CLIENT_ID) {
                        deals = await enrichDealsWithIgdb(steamAppId, deals, iconMap)
                    }

                    // Search ITAD for console editions (e.g. "Hollow Knight: Voidheart Edition")
                    // to add Nintendo eShop, Xbox, and PlayStation Store deals missing from the PC entry.
                    const editionIds = await findConsoleEditionIds(title, itadId)
                    if (editionIds.length > 0) {
                        const existingStoreIds = new Set(deals.map(d => d.storeID))
                        const editionDeals = await Promise.all(editionIds.map(fetchItadDeals))
                        for (const rawEdition of editionDeals) {
                            for (const d of rawEdition) {
                                const sid = String(d.shop.id)
                                if (!existingStoreIds.has(sid)) {
                                    deals.push({
                                        storeID: sid,
                                        storeName: d.shop.name,
                                        storeIcon: resolveIcon(d.shop.id, d.shop.name, iconMap),
                                        salePrice: d.price.amount.toFixed(2),
                                        normalPrice: d.regular.amount.toFixed(2),
                                        savings: d.cut,
                                        dealID: d.url,   // use ITAD affiliate URL as dealID so link is correct
                                        dealLink: d.url,
                                    })
                                    existingStoreIds.add(sid)
                                }
                            }
                        }
                        // Re-sort: Steam first, then cheapest
                        deals.sort((a, b) => {
                            if (a.storeID === "61") return -1
                            if (b.storeID === "61") return 1
                            return parseFloat(a.salePrice) - parseFloat(b.salePrice)
                        })
                    }

                    return save(deals)
                }
            }
        } catch (err) {
            console.error("[ITAD] Deals fetch failed for steamAppId", steamAppId, err)
        }

        // ITAD unavailable, not configured, or returned no deals for this game.
        // Fetch Steam direct price. GOG is covered by ITAD when the game is on GOG —
        // no fallback needed (GOG is a curated store, not a marketplace).
        const steamDeal = await getSteamDirectPrice(steamAppId)

        // Steam's appdetails API returns success:false for some publishers (e.g. Rockstar/Take-Two)
        // even when the game is genuinely available on Steam. In that case we synthesize a minimal
        // deal entry using the known appId so the user always gets a valid Steam store link.
        const effectiveSteamDeal: DealResult = steamDeal ?? {
            storeID: "1",
            storeName: "Steam",
            storeIcon: STEAM_ICON,
            salePrice: "N/A",
            normalPrice: "N/A",
            savings: 0,
            dealID: "",
            dealLink: `https://store.steampowered.com/app/${steamAppId}/`,
        }

        return save([effectiveSteamDeal])
    }

    // ── Path A.5: ITAD via title (year-aware) ───────────────────────────────────
    // Runs when steamAppId is absent. Covers games where RAWG has no Steam store
    // URL but ITAD tracks the title (e.g. new PC games, Epic-exclusive titles).
    // Uses the same lookupItadIdByTitle called by getCardPricesService so the
    // same year-disambiguation and variant logic applies.
    try {
        const itadId = await lookupItadIdByTitle(title, releaseYear)
        if (itadId) {
            const [rawDeals, iconMap] = await Promise.all([
                fetchItadDeals(itadId),
                buildIconMap(),
            ])
            if (rawDeals.length > 0) {
                const deals: DealResult[] = rawDeals
                    .map(d => ({
                        storeID:     String(d.shop.id),
                        storeName:   d.shop.name,
                        storeIcon:   resolveIcon(d.shop.id, d.shop.name, iconMap),
                        salePrice:   d.price.amount.toFixed(2),
                        normalPrice: d.regular.amount.toFixed(2),
                        savings:     d.cut ?? 0,
                        dealID:      itadId,
                        dealLink:    d.url,
                    }))
                    .sort((a, b) => parseFloat(a.salePrice) - parseFloat(b.salePrice))
                console.log(`[ITAD] Path A.5: "${title}" → ${deals.length} deal(s) via title lookup`)
                return save(deals)
            }
            console.log(`[ITAD] Path A.5: "${title}" → ITAD id found (${itadId}) but no current deals, falling to CheapShark`)
        }
    } catch (err) {
        console.warn("[ITAD] Path A.5 failed for", title, err instanceof Error ? err.message : String(err))
    }

    // ── Path B: CheapShark — last resort for games not in ITAD ──────────────
    // Each CheapShark call goes through csLimiter so bottleneck handles
    // concurrency + min-gap + queue-timeout. BSExpired (queue timeout after 3 s)
    // is caught below and degrades to an empty result.
    try {
        const [{ data: candidates }, stores] = await Promise.all([
            csLimiter.schedule({ expiration: 3000 }, () => withRetry(
                () => axios.get("https://www.cheapshark.com/api/1.0/games", {
                    params: { title, limit: 10 },
                }),
                2, 500, false,  // fail-fast on 429
            )),
            getCsStores(),
        ])

        if (!Array.isArray(candidates) || candidates.length === 0) return save([])

        const norm = normTitle(title)

        // Level 1 — exact normalised match (most reliable)
        let best: CsGameCandidate | undefined =
            (candidates as CsGameCandidate[]).find(g => normTitle(g.external) === norm)

        // Level 2 — edition variant match (bidirectional, edition-suffix guard)
        // "Grand Theft Auto: Vice City" ↔ "Grand Theft Auto: Vice City – The Definitive Edition"
        // "Hollow Knight" ↔ "Hollow Knight Voidheart Edition" (Voidheart isn't an edition word → rejected)
        // "Grand Theft Auto" ↔ "Grand Theft Auto: San Andreas" ("san" isn't an edition word → rejected)
        // Among multiple edition variants, prefer the SHORTEST title (closest to base game).
        if (!best) {
            const editionMatches = (candidates as CsGameCandidate[])
                .filter(g => isEditionVariant(g.external, title))
                .sort((a, b) => a.external.length - b.external.length)
            best = editionMatches[0]
            if (best) {
                console.log(`[CheapShark] Path B: edition variant "${title}" → "${best.external}"`)
            }
        }

        // Level 3 — bidirectional acronym match
        // "gta v" matches "grand theft auto v"
        if (!best) best =
            (candidates as CsGameCandidate[]).find(g => acronymMatch(title, g.external))

        // No match → log candidates for audit, return empty rather than guess.
        if (!best?.gameID) {
            console.log(`[CheapShark] Path B: "${title}" — no confident match. Candidates: ${(candidates as CsGameCandidate[]).map(g => g.external).join(" | ")}`)
            return save([])
        }

        console.log(`[CheapShark] Path B: "${title}" → "${best.external}" (gameID ${best.gameID})`)

        const { data: rawList } = await csLimiter.schedule({ expiration: 3000 }, () => withRetry(
            () => axios.get<CsDeal[]>("https://www.cheapshark.com/api/1.0/deals", {
                params: { gameID: best.gameID, sortBy: "Price", pageSize: 30 },
            }),
            2, 500, false,  // fail-fast on 429
        ))

        const storeMap = Object.fromEntries(stores.map(s => [s.storeID, s]))
        const rawDeals: DealResult[] = rawList.map(d => {
            const store = storeMap[d.storeID]
            return {
                storeID: d.storeID,
                storeName: store?.storeName ?? `Store ${d.storeID}`,
                storeIcon: store ? `https://www.cheapshark.com${store.images.icon}` : "",
                salePrice: d.salePrice,
                normalPrice: d.normalPrice,
                savings: parseFloat(d.savings),
                dealID: d.dealID,
                dealLink: `https://www.cheapshark.com/redirect?dealID=${d.dealID}`,
            }
        })

        // Deduplicate — cheapest deal per store
        const byStore = new Map<string, DealResult>()
        for (const deal of rawDeals) {
            const ex = byStore.get(deal.storeID)
            if (!ex || parseFloat(deal.salePrice) < parseFloat(ex.salePrice))
                byStore.set(deal.storeID, deal)
        }

        const csDeals = [...byStore.values()].sort(
            (a, b) => parseFloat(a.salePrice) - parseFloat(b.salePrice)
        )

        return save(csDeals)
    } catch (err) {
        if (isBSExpired(err)) return save([])   // queue timeout — degrade silently
        console.error("[GameDeals] CheapShark path failed:", err instanceof Error ? err.message : String(err))
        return []
    }
}

// ─── DLC deals ────────────────────────────────────────────────────────────────
// Show which DLCs of a game are currently on sale. Flow:
//   1. Steam appdetails → base game's `dlc: number[]` list (DLC appIDs)
//   2. For each DLC appID → resolve ITAD UUID via /games/lookup/v1?appid=
//   3. Batch POST /games/prices/v3 with all UUIDs (one call → all DLC prices)
//   4. Return one DealResult per DLC × store, tagged with `dlcName` so the UI can
//      group/display the DLC title alongside the store row.

interface SteamDlcDetailsEntry {
    success: boolean
    data?: {
        name?: string
        type?: string
        dlc?: number[]
    }
}

const dlcDealsCache = new Map<string, { deals: DealResult[]; expiresAt: number }>()
const DLC_DEALS_TTL = 30 * 60 * 1000   // 30 min, same as base game deals
const itadAppidLookupCache = new Map<number, { id: string | null; title: string | null; expiresAt: number }>()
const ITAD_APPID_TTL = 7 * 24 * 60 * 60 * 1000

async function lookupItadGameByAppid(appid: number): Promise<{ id: string; title: string } | null> {
    const hit = itadAppidLookupCache.get(appid)
    if (hit && hit.expiresAt > Date.now()) {
        return hit.id && hit.title ? { id: hit.id, title: hit.title } : null
    }
    const headers = itadHeaders()
    if (!headers) return null
    try {
        const { data } = await axios.get(`${ITAD_BASE}/games/lookup/v1`, {
            params: { appid },
            headers,
            timeout: 8000,
        })
        if (data.found && data.game?.id && data.game?.title) {
            itadAppidLookupCache.set(appid, {
                id: String(data.game.id),
                title: String(data.game.title),
                expiresAt: Date.now() + ITAD_APPID_TTL,
            })
            return { id: String(data.game.id), title: String(data.game.title) }
        }
        itadAppidLookupCache.set(appid, { id: null, title: null, expiresAt: Date.now() + ITAD_APPID_TTL })
        return null
    } catch {
        return null
    }
}

/**
 * Returns store deals for every DLC of the given base game that currently has
 * a real price on at least one store. Only callable when a steamAppId is known
 * (DLC lists are sourced from Steam appdetails — no ITAD-only equivalent).
 *
 * Behaviour:
 *   • Empty array when the game has no DLC, when ITAD has no DLC pricing, or
 *     when the steamAppId is missing.
 *   • Each row has `dlcName` set; UI groups/labels by DLC.
 */
export const getGameDlcDealsService = async (
    steamAppId: string,
): Promise<DealResult[]> => {
    const cacheKey = `dlc:${steamAppId}`
    const cached = dlcDealsCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
        console.log(`[DLC] serving "${steamAppId}" from cache (${cached.deals.length} deal(s))`)
        return cached.deals
    }
    const save = (deals: DealResult[]) => {
        dlcDealsCache.set(cacheKey, { deals, expiresAt: Date.now() + DLC_DEALS_TTL })
        console.log(`[DLC] "${steamAppId}" → ${deals.length} DLC deal(s)`)
        return deals
    }

    // 1. Get DLC list from Steam
    let dlcAppIds: number[] = []
    try {
        const { data } = await axios.get<Record<string, SteamDlcDetailsEntry>>(
            "https://store.steampowered.com/api/appdetails",
            { params: { appids: steamAppId, cc: "us", filters: "basic" }, timeout: 8000 },
        )
        const entry = data[steamAppId]
        if (!entry?.success || !entry.data?.dlc?.length) return save([])
        dlcAppIds = entry.data.dlc.slice(0, 40)   // cap to 40 to limit API calls
    } catch (err) {
        console.warn("[DLC] Steam appdetails failed:", err instanceof Error ? err.message : String(err))
        return save([])
    }

    if (dlcAppIds.length === 0) return save([])

    // 2. Resolve each DLC appid → ITAD UUID + title
    const lookups = await Promise.all(dlcAppIds.map(lookupItadGameByAppid))
    const dlcMeta = lookups
        .map((l, i) => l ? { appid: dlcAppIds[i], itadId: l.id, name: l.title } : null)
        .filter((x): x is { appid: number; itadId: string; name: string } => x !== null)

    if (dlcMeta.length === 0) return save([])

    // 3. Batch ITAD prices for all DLC UUIDs
    const headers = itadHeaders()
    if (!headers) return save([])

    let priceData: { id: string; deals: ItadRawDeal[] }[] = []
    try {
        const ids = dlcMeta.map(d => d.itadId)
        const { data } = await axios.post<{ id: string; deals: ItadRawDeal[] }[]>(
            `${ITAD_BASE}/games/prices/v3`,
            ids,
            { params: { country: "US" }, headers, timeout: 10000 },
        )
        priceData = Array.isArray(data) ? data : []
    } catch (err) {
        console.warn("[DLC] ITAD prices failed:", err instanceof Error ? err.message : String(err))
        return save([])
    }

    // 4. Build DealResult[] — one row per DLC × store, tagged with dlcName.
    //    Only include DLCs that have at least one real deal (filters out 0-deal entries).
    const iconMap = await buildIconMap()
    const byId = new Map(dlcMeta.map(d => [d.itadId, d]))
    const out: DealResult[] = []

    for (const entry of priceData) {
        const meta = byId.get(entry.id)
        if (!meta || !entry.deals?.length) continue
        for (const d of entry.deals) {
            out.push({
                storeID: String(d.shop.id),
                storeName: d.shop.name,
                storeIcon: resolveIcon(d.shop.id, d.shop.name, iconMap),
                salePrice: d.price.amount.toFixed(2),
                normalPrice: d.regular.amount.toFixed(2),
                savings: d.cut,
                dealID: `dlc-${meta.appid}-${d.shop.id}`,
                dealLink: d.url,
                dlcName: meta.name,
            })
        }
    }

    // Sort: discounted first (biggest cut), then cheapest. Keeps real sales on top.
    out.sort((a, b) => {
        if (b.savings !== a.savings) return b.savings - a.savings
        return parseFloat(a.salePrice) - parseFloat(b.salePrice)
    })

    return save(out)
}

// ─── Batch price fetching — concurrency-capped ───────────────────────────────

const BATCH_CONCURRENCY = 5   // max parallel CheapShark calls

/**
 * Fetches lowest prices for an array of game titles.
 * Uses `Promise.allSettled` in batches of 5 so one failure doesn't abort the rest.
 * Returns a map of { title: price | null }.
 */
export const batchGetPricesService = async (
    titles: string[],
): Promise<Record<string, string | null>> => {
    if (titles.length === 0) return {}
    const result: Record<string, string | null> = {}

    for (let i = 0; i < titles.length; i += BATCH_CONCURRENCY) {
        const batch = titles.slice(i, i + BATCH_CONCURRENCY)
        const settled = await Promise.allSettled(batch.map(t => getGamePriceService(t)))
        settled.forEach((res, idx) => {
            result[batch[idx]] = res.status === "fulfilled" ? res.value : null
        })
    }

    return result
}

// ─── GamerPower Giveaways ─────────────────────────────────────────────────────

export interface GiveawayResult {
    id: number
    title: string
    worth: string
    thumbnail: string
    description: string
    instructions: string
    claimUrl: string
    endDate: string
    platforms: string
    users: number
}

const gpCache = { items: [] as GiveawayResult[], expiresAt: 0 }
const GP_TTL = 30 * 60 * 1000  // 30 min

export const getGameGiveawaysService = async (title: string): Promise<GiveawayResult[]> => {
    if (Date.now() > gpCache.expiresAt) {
        try {
            const { data } = await axios.get<GamerPowerRaw[]>(
                "https://www.gamerpower.com/api/giveaways",
                { params: { platform: "pc", type: "game" } },
            )
            gpCache.items = data.map((g: GamerPowerRaw) => ({
                id: g.id,
                title: g.title,
                worth: g.worth,
                thumbnail: g.thumbnail,
                description: g.description,
                instructions: g.instructions,
                claimUrl: g.open_giveaway_url,
                endDate: g.end_date,
                platforms: g.platforms,
                users: g.users,
            }))
            gpCache.expiresAt = Date.now() + GP_TTL
        } catch (err) {
            console.warn("[GamerPower] Fetch failed:", err instanceof Error ? err.message : String(err))
            if (gpCache.items.length === 0) return []
            // stale cache better than empty — leave expiresAt in the past
        }
    }
    if (gpCache.items.length === 0) return []
    const fuse = new Fuse(gpCache.items, { keys: ["title"], threshold: 0.35, includeScore: true })
    return fuse.search(title).map(r => r.item).slice(0, 3)
}

// ─── IGDB (Twitch) — cross-store ID mapping ───────────────────────────────────

const IGDB_BASE = "https://api.igdb.com/v4"

let igdbToken = ""
let igdbTokenExp = 0
let igdbRefreshPromise: Promise<string | null> | null = null

async function fetchNewIgdbToken(): Promise<string | null> {
    const clientId = process.env.IGDB_CLIENT_ID
    const clientSecret = process.env.IGDB_CLIENT_SECRET
    if (!clientId || !clientSecret) return null
    try {
        const { data } = await axios.post(
            "https://id.twitch.tv/oauth2/token",
            new URLSearchParams({
                grant_type: "client_credentials",
                client_id: clientId,
                client_secret: clientSecret,
            }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
        )
        igdbToken = data.access_token as string
        igdbTokenExp = Date.now() + ((data.expires_in as number) - 60) * 1000
        return igdbToken
    } catch (err) {
        console.error("[IGDB] Token fetch failed:", err)
        return null
    }
}

// Singleton refresh: concurrent callers share one in-flight request instead of
// each firing their own — prevents Twitch rate-limit hits on simultaneous refreshes.
async function getIgdbToken(): Promise<string | null> {
    if (igdbToken && Date.now() < igdbTokenExp) return igdbToken
    if (!igdbRefreshPromise) {
        igdbRefreshPromise = fetchNewIgdbToken().finally(() => { igdbRefreshPromise = null })
    }
    return igdbRefreshPromise
}

interface IgdbExternalIds {
    igdbId: number
    gog?: string
    epic?: string
    xbox?: string
    ps?: string
    nintendo?: string
}

// IGDB external_games category constants
const IGDB_CAT_STEAM = 1
const IGDB_CAT_GOG = 5
const IGDB_CAT_XBOX = 11
const IGDB_CAT_EPIC = 26
const IGDB_CAT_NINTENDO = 36
const IGDB_CAT_PS4 = 45
const IGDB_CAT_PS5 = 69

const igdbExtCache = new Map<string, { data: IgdbExternalIds; expiresAt: number }>()
const IGDB_TTL = 7 * 24 * 60 * 60 * 1000  // 7 days — IDs are permanent

/**
 * Given a Steam AppID, returns GOG/Epic/Xbox/PS/Nintendo IDs from IGDB.
 * Cached 7 days. Returns null when IGDB credentials are missing or game not found.
 */
async function getIgdbExternalIds(steamAppId: string): Promise<IgdbExternalIds | null> {
    const key = `steam:${steamAppId}`
    const hit = igdbExtCache.get(key)
    if (hit && hit.expiresAt > Date.now()) return hit.data

    const token = await getIgdbToken()
    if (!token) return null

    const clientId = process.env.IGDB_CLIENT_ID
    if (!clientId) return null
    const headers = {
        "Client-ID": clientId,
        "Authorization": `Bearer ${token}`,
    }

    try {
        // Step 1: Steam AppID → IGDB game ID
        const { data: extSteam } = await axios.post(
            `${IGDB_BASE}/external_games`,
            `fields game,uid,category; where uid = "${steamAppId}" & category = ${IGDB_CAT_STEAM}; limit 1;`,
            { headers },
        )
        if (!extSteam?.length) return null
        const igdbId: number = extSteam[0].game

        // Step 2: IGDB game ID → all other store IDs
        const { data: allExt } = await axios.post(
            `${IGDB_BASE}/external_games`,
            `fields uid,category; where game = ${igdbId} & category = (${IGDB_CAT_GOG},${IGDB_CAT_EPIC},${IGDB_CAT_XBOX},${IGDB_CAT_NINTENDO},${IGDB_CAT_PS4},${IGDB_CAT_PS5}); limit 20;`,
            { headers },
        )

        const result: IgdbExternalIds = { igdbId }
        for (const e of (allExt ?? [])) {
            if (e.category === IGDB_CAT_GOG) result.gog = String(e.uid)
            if (e.category === IGDB_CAT_EPIC) result.epic = String(e.uid)
            if (e.category === IGDB_CAT_XBOX) result.xbox = String(e.uid)
            if (e.category === IGDB_CAT_NINTENDO) result.nintendo = String(e.uid)
            if (e.category === IGDB_CAT_PS4 || e.category === IGDB_CAT_PS5) result.ps = String(e.uid)
        }

        igdbExtCache.set(key, { data: result, expiresAt: Date.now() + IGDB_TTL })
        return result
    } catch (err) {
        console.error("[IGDB] External IDs lookup failed:", err)
        return null
    }
}

/**
 * Enrich an existing deals array with GOG/Epic deals sourced via IGDB → ITAD.
 * Only adds stores not already present. Called after the primary ITAD/Steam path.
 */
async function enrichDealsWithIgdb(
    steamAppId: string,
    existingDeals: DealResult[],
    iconMap: Map<string, string>,
): Promise<DealResult[]> {
    try {
        const ext = await getIgdbExternalIds(steamAppId)
        if (!ext) return existingDeals

        const existingStoreIds = new Set(existingDeals.map(d => d.storeID.toLowerCase()))

        // ITAD numeric shop IDs (from GET /shops/v1 — stable, confirmed in skill)
        const ITAD_SHOP_ID: Record<string, number> = { gog: 35, epicgames: 26 }

        const storeAttempts: Array<{ shop: string; shopId: number; uid: string; displayName: string }> = []
        if (ext.gog && !existingStoreIds.has("35"))
            storeAttempts.push({ shop: "gog", shopId: ITAD_SHOP_ID.gog, uid: ext.gog, displayName: "GOG" })
        if (ext.epic && !existingStoreIds.has("26"))
            storeAttempts.push({ shop: "epicgames", shopId: ITAD_SHOP_ID.epicgames, uid: ext.epic, displayName: "Epic Games" })
        if (storeAttempts.length === 0) return existingDeals

        const extraDeals: DealResult[] = []

        await Promise.allSettled(storeAttempts.map(async ({ shopId, uid, displayName }) => {
            try {
                const headers = itadHeaders()
                if (!headers) return
                // Skill: use POST /lookup/id/shop/{shopId}/v1 for non-Steam store IDs.
                // GET /games/lookup/v1 only accepts `appid` (Steam) or `title` — not shop+id pairs.
                const { data: lookupMap } = await axios.post<Record<string, string | null>>(
                    `${ITAD_BASE}/lookup/id/shop/${shopId}/v1`,
                    [uid],
                    { headers },
                )
                const itadId = lookupMap[uid]
                if (!itadId) return
                const rawDeals = await fetchItadDeals(itadId)
                // shop.id is a number — compare numerically against the known shopId
                const relevant = rawDeals.filter(d => d.shop.id === shopId)
                for (const d of relevant) {
                    const sid = String(d.shop.id)
                    if (!existingStoreIds.has(sid)) {
                        extraDeals.push({
                            storeID: sid,
                            storeName: d.shop.name,
                            storeIcon: resolveIcon(d.shop.id, d.shop.name, iconMap),
                            salePrice: d.price.amount.toFixed(2),
                            normalPrice: d.regular.amount.toFixed(2),
                            savings: d.cut,
                            dealID: itadId,
                            dealLink: d.url,
                        })
                    }
                }
            } catch (err) {
                console.warn(`[IGDB] Failed to enrich ${displayName} deals:`, err instanceof Error ? err.message : String(err))
            }
        }))

        if (extraDeals.length === 0) return existingDeals
        return [...existingDeals, ...extraDeals]
            .sort((a, b) => parseFloat(a.salePrice) - parseFloat(b.salePrice))
    } catch (err) {
        console.error("[IGDB] enrichDealsWithIgdb failed:", err instanceof Error ? err.message : String(err))
        return existingDeals
    }
}

// ─── IGDB descriptions (replaces dead GiantBomb API) ─────────────────────────
// GiantBomb went offline after leaving Fandom — IGDB summary/storyline is the best
// free replacement. We reuse the IGDB token already managed above.

const igdbDescCache = new Map<string, { summary: string; expiresAt: number }>()
const IGDB_DESC_TTL = 24 * 60 * 60 * 1000  // 24 hours

/**
 * Fetches the IGDB editorial summary for a game.
 * Primary path:  steamAppId → igdbId (reuses external ID lookup) → GET summary field
 * Fallback path: title search → pick best match → GET summary field
 * Cached 24 hours. Returns null when IGDB credentials are missing.
 */
export const getIgdbSummaryService = async (
    title: string,
    steamAppId?: string,
): Promise<string | null> => {
    const cacheKey = steamAppId ? `igdb-desc:steam:${steamAppId}` : `igdb-desc:title:${title.toLowerCase().trim()}`
    const hit = igdbDescCache.get(cacheKey)
    if (hit && hit.expiresAt > Date.now()) return hit.summary || null

    const token = await getIgdbToken()
    if (!token) return null

    const clientId = process.env.IGDB_CLIENT_ID
    if (!clientId) return null
    const headers = {
        "Client-ID": clientId,
        "Authorization": `Bearer ${token}`,
    }

    try {
        let igdbId: number | null = null

        // Path A: use steamAppId — reuse getIgdbExternalIds (already cached 7 days)
        if (steamAppId) {
            const ext = await getIgdbExternalIds(steamAppId)
            if (ext) igdbId = ext.igdbId
        }

        // Path B: title search fallback
        if (!igdbId) {
            const safeTitle = title.replace(/"/g, "")
            const { data: searchResults } = await axios.post(
                `${IGDB_BASE}/games`,
                `search "${safeTitle}"; fields id,name; limit 5;`,
                { headers },
            )
            if (searchResults?.length) {
                const fuse = new Fuse<{ id: number; name: string }>(searchResults, { keys: ["name"], threshold: 0.3 })
                const match = fuse.search(title)[0]?.item ?? searchResults[0]
                igdbId = match.id
            }
        }

        if (!igdbId) {
            igdbDescCache.set(cacheKey, { summary: "", expiresAt: Date.now() + IGDB_DESC_TTL })
            return null
        }

        // Fetch summary + storyline for the resolved game
        const { data: gameData } = await axios.post(
            `${IGDB_BASE}/games`,
            `fields summary,storyline; where id = ${igdbId}; limit 1;`,
            { headers },
        )
        const game = gameData?.[0]
        const summary = game?.summary || game?.storyline || ""

        igdbDescCache.set(cacheKey, { summary, expiresAt: Date.now() + IGDB_DESC_TTL })
        return summary || null
    } catch (err) {
        console.error("[IGDB] Summary fetch failed:", err instanceof Error ? err.message : String(err))
        return null
    }
}

// ─── Steam Game Events (News API) ────────────────────────────────────────────
// Uses the free Steam ISteamNews API — no key required.
// Returns game announcements, events, and patch notes as a news feed.

/** Raw shape returned by Steam ISteamNews/GetNewsForApp/v2 */
interface SteamNewsItem {
    gid: string
    title: string
    url: string
    is_external_url: boolean
    author: string
    contents: string
    feedlabel: string
    date: number   // Unix timestamp (seconds)
    feedname: string
    feed_type: number
    appid: number
}

interface SteamNewsResponse {
    appnews?: {
        appid: number
        newsitems: SteamNewsItem[]
    }
}

export interface GameEvent {
    id: string
    title: string
    url: string
    author: string
    summary: string   // stripped plain-text excerpt (~200 chars)
    date: number   // Unix timestamp (seconds)
    feedLabel: string   // e.g. "Community Announcements", "Game Updates"
    isExternal: boolean
}

/** Strip HTML tags and decode common entities for a plain-text excerpt. */
function stripHtml(html: string): string {
    return html
        .replace(/<[^>]*>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim()
}

const eventsCache = new Map<string, { items: GameEvent[]; expiresAt: number }>()
const EVENTS_TTL = 15 * 60 * 1000  // 15 minutes

/**
 * Fetches up to 10 recent Steam news/event items for a game.
 * Cached 15 minutes. Returns [] for non-Steam games or on failure.
 */
export const getGameEventsService = async (steamAppId: string): Promise<GameEvent[]> => {
    const hit = eventsCache.get(steamAppId)
    if (hit && hit.expiresAt > Date.now()) return hit.items

    try {
        const { data } = await axios.get<SteamNewsResponse>(
            "https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/",
            {
                params: {
                    appid: steamAppId,
                    count: 10,
                    maxlength: 400,
                    format: "json",
                },
                timeout: 8000,
            },
        )

        const items: GameEvent[] = (data.appnews?.newsitems ?? []).map(n => ({
            id: n.gid,
            title: n.title,
            url: n.url,
            author: n.author || "Steam",
            summary: stripHtml(n.contents).slice(0, 220),
            date: n.date,
            feedLabel: n.feedlabel,
            isExternal: n.is_external_url,
        }))

        eventsCache.set(steamAppId, { items, expiresAt: Date.now() + EVENTS_TTL })
        return items
    } catch (err) {
        console.warn("[SteamNews] Fetch failed for appid", steamAppId, ":", err instanceof Error ? err.message : String(err))
        return []
    }
}

