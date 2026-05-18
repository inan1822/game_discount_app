import axios from "axios"
import fs   from "fs"
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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatGame = (game: RawgGame): GameSearchResult => ({
    id:       game.id,
    slug:     game.slug,
    name:     game.name,
    cover:    game.background_image,
    rating:   game.rating,
    genres:   game.genres?.map(g => g.name) ?? [],
    // Use specific platforms if available, fall back to parent_platforms for broader coverage
    platforms: (game.platforms?.length
        ? game.platforms
        : game.parent_platforms ?? []
    ).map(p => p.platform.name),
    released:   game.released,
    metacritic: game.metacritic,
})

/** Returns "YYYY-MM-DD,YYYY-MM-DD" from N years ago to today */
function dateRange(yearsBack: number): string {
    const today = new Date()
    const past  = new Date()
    past.setFullYear(today.getFullYear() - yearsBack)
    const fmt = (d: Date) => d.toISOString().split("T")[0]
    return `${fmt(past)},${fmt(today)}`
}

// ─── RAWG Cache ───────────────────────────────────────────────────────────────

const rawgCache = new Map<string, { data: unknown; expiresAt: number }>()
const RAWG_TTL  = 10 * 60 * 1000  // 10 minutes

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
            key:               RAWG_KEY,
            search:            query,
            page_size:         20,
            page,
            exclude_additions: true,
        }
    })
    return (data.results as RawgGame[]).map(formatGame)
}

/** Single game detail — cached 10 min */
export const getGameByIdService = async (id: string): Promise<GameSearchResult & { description: string }> => {
    return cachedRawg(`game:${id}`, async () => {
        const { data } = await axios.get(`${RAWG_BASE}/games/${id}`, {
            params: { key: RAWG_KEY }
        })
        if (!data || !data.id) throw new AppError("Game not found", 404)
        return { ...formatGame(data), description: data.description_raw ?? "" }
    })
}

/** POPULAR — cached 10 min per page */
export const getPopularGamesService = async (page = 1): Promise<GameSearchResult[]> => {
    return cachedRawg(`popular:${page}`, async () => {
        const { data } = await axios.get(`${RAWG_BASE}/games`, {
            params: {
                key:               RAWG_KEY,
                ordering:          "-added",
                page_size:         20,
                page,
                exclude_additions: true,
                metacritic:        "70,100",
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
                key:               RAWG_KEY,
                dates:             dateRange(1),
                ordering:          "-released",
                page_size:         20,
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
                key:               RAWG_KEY,
                dates:             dateRange(3),
                ordering:          "-added",
                page_size:         20,
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
                key:               RAWG_KEY,
                tags:              "free-to-play",
                ordering:          "-added",
                page_size:         20,
                exclude_additions: true,
                metacritic:        "60,100",
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
                key:               RAWG_KEY,
                ordering:          "-rating",
                page_size:         40,
                exclude_additions: true,
                metacritic:        "75,100",
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
    title:       string
    cover:       string | null
    salePrice:   string
    normalPrice: string
    savings:     number
    storeName:   string
    storeIcon:   string
    dealLink:    string
    gameId:      number | null   // RAWG id if we can match
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
        const store    = storeMap[top.storeID]

        // Try to enrich with RAWG cover
        let cover: string | null  = null
        let gameId: number | null = null
        try {
            const { data: rawgData } = await axios.get(`${RAWG_BASE}/games`, {
                params: { key: RAWG_KEY, search: top.title, page_size: 1 }
            })
            if (rawgData.results?.[0]) {
                cover  = rawgData.results[0].background_image
                gameId = rawgData.results[0].id
            }
        } catch { /* cover stays null */ }

        const deal: DealOfDay = {
            title:       top.title,
            cover,
            salePrice:   top.salePrice,
            normalPrice: top.normalPrice,
            savings:     parseFloat(top.savings),
            storeName:   store?.storeName ?? `Store ${top.storeID}`,
            storeIcon:   store ? `https://www.cheapshark.com${store.images.icon}` : "",
            dealLink:    `https://www.cheapshark.com/redirect?dealID=${top.dealID}`,
            gameId,
        }

        dotdCache = { deal, expiresAt: Date.now() + DOTD_TTL }
        return deal
    } catch {
        return null
    }
}

/** BY GENRE — cached 10 min per genre */
export const getByGenreService = async (genre: string, page = 1): Promise<GameSearchResult[]> => {
    return cachedRawg(`by-genre:${genre}:${page}`, async () => {
        const { data } = await axios.get(`${RAWG_BASE}/games`, {
            params: {
                key:               RAWG_KEY,
                genres:            genre,
                ordering:          "-added",
                page_size:         20,
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
            const gameData = await cachedRawg<{ genres?: { slug: string }[] }>(`game-genres:${item.gameId}`, async () => {
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
                key:               RAWG_KEY,
                genres:            topGenre,
                ordering:          "-added",
                page_size:         30,
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
const CACHE_TTL       = 60 * 60 * 1000   // 1 hour
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
    } catch { /* corrupt file — start fresh */ }
}

function savePriceCacheToDisk() {
    try {
        const dir = path.dirname(PRICE_CACHE_FILE)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(PRICE_CACHE_FILE, JSON.stringify(Object.fromEntries(priceCache)))
    } catch { /* ignore write errors */ }
}

loadPriceCacheFromDisk()   // run once at module load

/**
 * Returns the current lowest price for a game from CheapShark, or null when not found.
 * null  = not in CheapShark DB (console exclusive, very new) → card shows "Unknown"
 * "0.00"= in DB and genuinely free (Dota 2, CS2, Warframe)  → card shows "Free"
 */
export const getGamePriceService = async (title: string): Promise<string | null> => {
    const key    = title.toLowerCase().trim()
    const cached = priceCache.get(key)
    if (cached && cached.expiresAt > Date.now()) return cached.price

    try {
        const { data } = await axios.get("https://www.cheapshark.com/api/1.0/games", {
            params: { title, limit: 1 },
        })
        const price = (Array.isArray(data) && data[0]?.cheapest != null)
            ? String(data[0].cheapest)
            : null
        const entry: PriceCacheEntry = { price, expiresAt: Date.now() + CACHE_TTL }
        priceCache.set(key, entry)
        savePriceCacheToDisk()          // persist immediately after each new price
        return price
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[CheapShark] 429/error for "${title}": ${msg}`)
        return null   // don't cache errors — allow retry on next load
    }
}

// ─── Deals (CheapShark proxy — full store list for game detail page) ─────────

interface CsStore { storeID: string; storeName: string; images: { icon: string } }
interface CsDeal  { storeID: string; dealID: string; salePrice: string; normalPrice: string; savings: string; title?: string }

let csStoresCache: CsStore[] | null = null
let csStoresExpiry = 0
const CS_STORES_TTL = 24 * 60 * 60 * 1000  // 24 h — store list rarely changes

async function getCsStores(): Promise<CsStore[]> {
    if (csStoresCache && Date.now() < csStoresExpiry) return csStoresCache
    const { data } = await axios.get<CsStore[]>("https://www.cheapshark.com/api/1.0/stores")
    csStoresCache  = data
    csStoresExpiry = Date.now() + CS_STORES_TTL
    return data
}

export interface DealResult {
    storeID:     string
    storeName:   string
    storeIcon:   string
    salePrice:   string
    normalPrice: string
    savings:     number
    dealID:      string
    dealLink:    string
}

const dealsCache = new Map<string, { deals: DealResult[]; expiresAt: number }>()
const DEALS_TTL  = 30 * 60 * 1000  // 30 min

/** Normalise a title for comparison: lowercase, strip punctuation, collapse spaces */
const normTitle = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim()

/**
 * Returns all current store deals for a game.
 * Strategy: 2 parallel calls → pick best title match → 1 deals call → deduplicate stores.
 * Never falls back to a random first result — wrong game = empty list.
 */
export const getGameDealsService = async (title: string): Promise<DealResult[]> => {
    const key    = title.toLowerCase().trim()
    const cached = dealsCache.get(key)
    if (cached && cached.expiresAt > Date.now()) return cached.deals

    try {
        // Step 1 — search CheapShark + prefetch stores IN PARALLEL (saves ~300 ms)
        const [{ data: games }, stores] = await Promise.all([
            axios.get("https://www.cheapshark.com/api/1.0/games", {
                params: { title, limit: 10 },
            }),
            getCsStores(),
        ])

        if (!Array.isArray(games) || games.length === 0) {
            dealsCache.set(key, { deals: [], expiresAt: Date.now() + DEALS_TTL })
            return []
        }

        const norm = normTitle(title)

        // Pick the single best matching gameID.
        // Priority 1: exact normalised title match  ("terraria" === "terraria")
        // Priority 2: one title is a prefix of the other ("terraria" / "terraria collectors")
        // No fallback to first result — prevents returning a completely wrong game's deals.
        const best =
            games.find((g: any) => normTitle(g.external) === norm) ??
            games.find((g: any) => {
                const t = normTitle(g.external)
                return t.startsWith(norm) || norm.startsWith(t)
            })

        if (!best?.gameID) {
            dealsCache.set(key, { deals: [], expiresAt: Date.now() + DEALS_TTL })
            return []
        }

        // Step 2 — ONE deals call for the best matching gameID
        const { data: rawList } = await axios.get<CsDeal[]>(
            "https://www.cheapshark.com/api/1.0/deals",
            { params: { gameID: best.gameID, sortBy: "Price", pageSize: 30 } },
        )

        const storeMap = Object.fromEntries(stores.map(s => [s.storeID, s]))
        const rawDeals: DealResult[] = rawList.map(d => {
            const store = storeMap[d.storeID]
            return {
                storeID:     d.storeID,
                storeName:   store?.storeName ?? `Store ${d.storeID}`,
                storeIcon:   store ? `https://www.cheapshark.com${store.images.icon}` : "",
                salePrice:   d.salePrice,
                normalPrice: d.normalPrice,
                savings:     parseFloat(d.savings),
                dealID:      d.dealID,
                dealLink:    `https://www.cheapshark.com/redirect?dealID=${d.dealID}`,
            }
        })

        // Deduplicate: keep only the cheapest deal per store
        const byStore = new Map<string, DealResult>()
        for (const deal of rawDeals) {
            const existing = byStore.get(deal.storeID)
            if (!existing || parseFloat(deal.salePrice) < parseFloat(existing.salePrice)) {
                byStore.set(deal.storeID, deal)
            }
        }
        const deals = [...byStore.values()]
            .sort((a, b) => parseFloat(a.salePrice) - parseFloat(b.salePrice))

        dealsCache.set(key, { deals, expiresAt: Date.now() + DEALS_TTL })
        return deals
    } catch {
        return []
    }
}

// ─── Legacy (kept for any existing usages) ────────────────────────────────────

/** @deprecated Use getPopularGamesService — kept for backward compat */
export const getTrendingGamesService = getPopularGamesService

/** @deprecated Use section-specific services */
export const getGamesByGenreService = async (genre: string, page = 1): Promise<GameSearchResult[]> => {
    const { data } = await axios.get(`${RAWG_BASE}/games`, {
        params: {
            key:               RAWG_KEY,
            genres:            genre,
            page_size:         20,
            page,
            ordering:          "-added",
            exclude_additions: true,
        }
    })
    return (data.results as RawgGame[]).map(formatGame)
}
