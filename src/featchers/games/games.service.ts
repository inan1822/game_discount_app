import axios from "axios"
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

// ─── CheapShark concurrency semaphore ────────────────────────────────────────
// Limits the number of simultaneous outbound CheapShark requests to CS_MAX_CONCURRENT.
// Returns true  → slot acquired, caller should proceed then call releaseCs().
// Returns false → timed out waiting (> timeoutMs ms), caller should return null immediately.
//
// Why we need a timeout: without one, 20 uncached titles queue behind 2 slots.
// The 10th title waits ~5s just for a semaphore slot — even though the CheapShark
// call itself fails in milliseconds (429 → fail-fast). The queue IS the bottleneck.

const CS_MAX_CONCURRENT = 2
let csInflight = 0
const csQueue: Array<() => void> = []

function acquireCs(timeoutMs = 3000): Promise<boolean> {
    return new Promise(resolve => {
        if (csInflight < CS_MAX_CONCURRENT) {
            csInflight++
            resolve(true)
        } else {
            let settled = false
            const cb = () => {
                if (settled) return   // timer already fired
                settled = true
                csInflight++
                resolve(true)
            }
            csQueue.push(cb)
            // Give up after timeoutMs — remove from queue and return false
            setTimeout(() => {
                if (settled) return
                settled = true
                const idx = csQueue.indexOf(cb)
                if (idx >= 0) csQueue.splice(idx, 1)
                resolve(false)
            }, timeoutMs)
        }
    })
}

function releaseCs(): void {
    // Transfer the slot directly to the next waiter rather than decrement-then-increment.
    // The old approach (csInflight-- first) left a window where a new acquireCs() call
    // could see csInflight < CS_MAX_CONCURRENT and grab a third slot before the queued
    // callback ran. Now: if a waiter exists, call its cb (which increments csInflight
    // itself); only decrement when nobody is waiting.
    const next = csQueue.shift()
    if (next) {
        next()          // cb does csInflight++ then resolve(true)
    } else {
        csInflight--    // no waiters — free the slot
    }
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

/** Single game detail — cached 10 min */
export const getGameByIdService = async (id: string): Promise<GameSearchResult & { description: string }> => {
    return cachedRawg(`game:${id}`, async () => {
        const { data } = await axios.get(`${RAWG_BASE}/games/${id}`, {
            params: { key: RAWG_KEY }
        })
        if (!data || !data.id) throw new AppError("Game not found", 404)

        // Primary: extract from RAWG store list
        // Fallback: query Steam Store Search API when RAWG has no Steam entry
        let steamAppId = extractSteamAppId(data.stores)
        if (!steamAppId) {
            steamAppId = await findSteamAppIdByTitle(data.name).catch(() => null) ?? undefined
        }

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
        // CheapShark: top deal by savings
        const [dealsRes, stores] = await Promise.all([
            axios.get("https://www.cheapshark.com/api/1.0/deals", {
                params: { sortBy: "Savings", pageSize: 5, lowerPrice: 1 }
            }),
            axios.get<{ storeID: string; storeName: string; images: { icon: string } }[]>(
                "https://www.cheapshark.com/api/1.0/stores"
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
        // Throttle concurrent CheapShark calls via semaphore.
        // acquireCs returns false if we waited > 3s — return null rather than
        // queuing behind 18 other titles all about to get 429 anyway.
        const acquired = await acquireCs()
        if (!acquired) return null

        try {
            const { data } = await withRetry(
                () => axios.get("https://www.cheapshark.com/api/1.0/games", {
                    params: { title, limit: 5 },
                }),
                2,      // 2 retries for transient network errors (not 429)
                500,
                false,  // retryOn429 = false → fail-fast on rate-limits
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
            const msg = err instanceof Error ? err.message : String(err)
            console.error(`[CheapShark] error for "${title}": ${msg}`)
            // Cache null for 3 min so repeated requests don't hammer CheapShark again
            priceCache.set(key, { price: null, expiresAt: Date.now() + 3 * 60 * 1000 })
            return null
        } finally {
            releaseCs()
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
        const { data } = await axios.get<CsStore[]>("https://www.cheapshark.com/api/1.0/stores")
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

// ─── G2A Marketplace ─────────────────────────────────────────────────────────
// G2A does NOT expose a public buyer-side search API. Their `integration-api`
// is for sellers only (requires OAuth + partner registration). The internal
// `integration/products` endpoint used by their own website blocks server-side
// requests (timeout / 404). Synthetic per-platform G2A search links are built
// in the frontend instead — see `buildPCFallbacks` / `buildSearchDeals` /
// `buildPSDeals` in `client/app/game/[id]/page.tsx`.
//
// This stub exists only so older call sites compile without changes; it always
// returns []. Callers should treat G2A as having no backend data.
export async function fetchG2ADeals(_title: string): Promise<DealResult[]> {
    return []
}

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

/** Lowercase, strip punctuation, collapse spaces */
const normTitle = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim()

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
 *   2. CheapShark title search → exact → prefix → acronym (no fuzzy — wrong match = wrong links)
 *   3. Empty list — never returns wrong game's deals
 */
export const getGameDealsService = async (
    title: string,
    steamAppId?: string,
): Promise<DealResult[]> => {
    const cacheKey = steamAppId ? `steam:${steamAppId}` : `title:${title.toLowerCase().trim()}`
    const cached = dealsCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
        console.log(`[Cache] serving "${title}" from file cache`)
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

    // ── Path B: CheapShark — only used for games with no Steam presence ───────
    const acquired = await acquireCs()
    if (!acquired) return save([])   // queue timeout — return empty rather than stall
    try {
        const [{ data: candidates }, stores] = await Promise.all([
            withRetry(
                () => axios.get("https://www.cheapshark.com/api/1.0/games", {
                    params: { title, limit: 10 },
                }),
                2, 500, false,  // fail-fast on 429
            ),
            getCsStores(),
        ])

        if (!Array.isArray(candidates) || candidates.length === 0) return save([])

        const norm = normTitle(title)

        // Level 1 — exact normalised match
        // "hollow knight" === "hollow knight"
        let best: CsGameCandidate | undefined =
            (candidates as CsGameCandidate[]).find(g => normTitle(g.external) === norm)

        // Level 2 — prefix match: candidate starts with the search term
        // "terraria" matches "terraria collectors edition" (candidate is longer)
        // Guards: both strings must be ≥ 5 chars AND the match must end on a word boundary.
        // Note: the reverse direction (search starts with candidate, i.e. "grand theft auto v"
        // matching "grand theft auto") is intentionally NOT checked — it would select the
        // wrong game when CheapShark has a shorter/older entry in the same franchise.
        const MIN_PREFIX = 5
        if (!best) best =
            (candidates as CsGameCandidate[]).find(g => {
                const t = normTitle(g.external)
                if (norm.length < MIN_PREFIX || t.length < MIN_PREFIX) return false
                if (t.startsWith(norm) && (t.length === norm.length || t[norm.length] === " ")) return true
                return false
            })

        // Level 3 — bidirectional acronym match
        // "gta v" matches "grand theft auto v"
        if (!best) best =
            (candidates as CsGameCandidate[]).find(g => acronymMatch(title, g.external))

        // No fuzzy fallback — if none of the above matched, the game is not
        // confidently in CheapShark's catalogue. Returning nothing is safer than
        // a fuzzy guess that could map to a completely different game's deals.
        if (!best?.gameID) return save([])

        const { data: rawList } = await withRetry(
            () => axios.get<CsDeal[]>("https://www.cheapshark.com/api/1.0/deals", {
                params: { gameID: best.gameID, sortBy: "Price", pageSize: 30 },
            }),
            2, 500, false,  // fail-fast on 429
        )

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
        console.error("[GameDeals] CheapShark path failed:", err instanceof Error ? err.message : String(err))
        return []
    } finally {
        releaseCs()
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

