import { Request, Response } from "express"
import { getErrorInfo } from "../../shared/utils/AppError.js"
import {
    searchGamesService,
    getGameByIdService,
    getPopularGamesService,
    getNewGamesService,
    getTrendedGamesService,
    getForYouService,
    getGamePriceService,
    getGameDealsService,
    getGameDlcDealsService,
    getFreeToPlayService,
    getHiddenGemsService,
    getDealOfDayService,
    getByGenreService,
    batchGetPricesService,
    getGameGiveawaysService,
    getGameEventsService,
    getCardPricesService,
} from "./games.service.js"

const getString = (val: unknown): string => {
    if (Array.isArray(val)) return String(val[0])
    return String(val ?? "")
}

export const searchGames = async (req: Request, res: Response): Promise<void> => {
    try {
        const q       = getString(req.query.q)
        const pageRaw = Number(req.query.page)
        const page    = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1
        const results = await searchGamesService(q, page)
        res.status(200).json({ status: "200", message: "OK", data: results })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const getGameById = async (req: Request, res: Response): Promise<void> => {
    try {
        const game = await getGameByIdService(getString(req.params.id))
        res.status(200).json({ status: "200", message: "OK", data: game })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

/** Popular — biggest communities (most added to user libraries) */
export const getPopularGames = async (req: Request, res: Response): Promise<void> => {
    try {
        const pageRaw = Number(req.query.page)
        const page    = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1
        const games = await getPopularGamesService(page)
        res.status(200).json({ status: "200", message: "OK", data: games })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

/** New — released in the last 12 months */
export const getNewGames = async (req: Request, res: Response): Promise<void> => {
    try {
        const pageRaw = Number(req.query.page)
        const page    = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1
        const games = await getNewGamesService(page)
        res.status(200).json({ status: "200", message: "OK", data: games })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

/** Trended — released in last 3 years, sorted by community traction */
export const getTrendedGames = async (req: Request, res: Response): Promise<void> => {
    try {
        const pageRaw = Number(req.query.page)
        const page    = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1
        const games = await getTrendedGamesService(page)
        res.status(200).json({ status: "200", message: "OK", data: games })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

/** For You — personalised based on wishlist genres (auth required) */
export const getForYou = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req.user as { id: string })?.id
        if (!userId) {
            res.status(401).json({ status: "401", message: "Unauthorized", data: null })
            return
        }
        const games  = await getForYouService(userId)
        res.status(200).json({ status: "200", message: "OK", data: games })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

/** Deals — all store deals for a game.
 *  Primary:  ITAD via ?steamAppId=105600 (exact match, no fuzzy needed)
 *  Fallback: CheapShark title search with exact → prefix → acronym → Fuse.js
 */
export const getGameDeals = async (req: Request, res: Response): Promise<void> => {
    try {
        const title       = getString(req.query.title)
        const steamAppId  = getString(req.query.steamAppId)  || undefined
        const rawYear     = getString(req.query.releaseYear)  || ""
        const releaseYear = rawYear ? (parseInt(rawYear, 10) || undefined) : undefined
        if (!title) {
            res.status(400).json({ status: "400", message: "title is required", data: null })
            return
        }
        const deals = await getGameDealsService(title, steamAppId, releaseYear)
        res.status(200).json({ status: "200", message: "OK", data: deals })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

/** DLC Deals — store discounts for every DLC of the given base game.
 *  Requires ?steamAppId=APPID (DLC list comes from Steam appdetails).
 */
export const getGameDlcDeals = async (req: Request, res: Response): Promise<void> => {
    try {
        const steamAppId = getString(req.query.steamAppId)
        if (!steamAppId) {
            res.status(400).json({ status: "400", message: "steamAppId is required", data: null })
            return
        }
        const deals = await getGameDlcDealsService(steamAppId)
        res.status(200).json({ status: "200", message: "OK", data: deals })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

/** Price — proxy to CheapShark (avoids browser CORS restrictions) */
export const getGamePrice = async (req: Request, res: Response): Promise<void> => {
    try {
        const title = getString(req.query.title)
        if (!title) {
            res.status(400).json({ status: "400", message: "title is required", data: null })
            return
        }
        const price = await getGamePriceService(title)
        res.status(200).json({ status: "200", message: "OK", data: { price } })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

/** Free to Play */
export const getFreeToPlay = async (_req: Request, res: Response): Promise<void> => {
    try {
        const games = await getFreeToPlayService()
        res.status(200).json({ status: "200", message: "OK", data: games })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

/** Hidden Gems */
export const getHiddenGems = async (_req: Request, res: Response): Promise<void> => {
    try {
        const games = await getHiddenGemsService()
        res.status(200).json({ status: "200", message: "OK", data: games })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

/** Deal of the Day */
export const getDealOfDay = async (_req: Request, res: Response): Promise<void> => {
    try {
        const deal = await getDealOfDayService()
        res.status(200).json({ status: "200", message: "OK", data: deal })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

/** By Genre */
export const getByGenre = async (req: Request, res: Response): Promise<void> => {
    try {
        const genre   = getString(req.query.genre)
        const pageRaw = Number(req.query.page)
        const page    = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1
        if (!genre) {
            res.status(400).json({ status: "400", message: "genre is required", data: null })
            return
        }
        const games = await getByGenreService(genre, page)
        res.status(200).json({ status: "200", message: "OK", data: games })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

/**
 * POST /api/v1/games/batch-prices
 * Body: { titles: string[] }  — max 20 titles per request
 * Returns: { [title]: price | null }
 * Requires: Bearer token (prevents abuse of the CheapShark proxy)
 */
export const batchPrices = async (req: Request, res: Response): Promise<void> => {
    try {
        const { titles } = req.body as { titles?: unknown }
        if (!Array.isArray(titles) || titles.length === 0) {
            res.status(400).json({ status: "400", message: "titles must be a non-empty array", data: null })
            return
        }
        if (titles.length > 20) {
            res.status(400).json({ status: "400", message: "Maximum 20 titles per request", data: null })
            return
        }
        if (!titles.every(t => typeof t === "string")) {
            res.status(400).json({ status: "400", message: "All titles must be strings", data: null })
            return
        }
        const prices = await batchGetPricesService(titles as string[])
        res.status(200).json({ status: "200", message: "OK", data: prices })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

/** Steam game events / news feed — requires steamAppId query param */
export const getGameEvents = async (req: Request, res: Response): Promise<void> => {
    try {
        const steamAppId = getString(req.query.steamAppId)
        if (!steamAppId) {
            res.status(400).json({ status: "400", message: "steamAppId is required", data: null })
            return
        }
        const events = await getGameEventsService(steamAppId)
        res.status(200).json({ status: "200", message: "OK", data: events })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

/** Giveaways — GamerPower free game giveaways matching the given title */
export const getGameGiveaways = async (req: Request, res: Response): Promise<void> => {
    try {
        const title = getString(req.query.title)
        if (!title) {
            res.status(400).json({ status: "400", message: "title is required", data: null })
            return
        }
        const giveaways = await getGameGiveawaysService(title)
        res.status(200).json({ status: "200", message: "OK", data: giveaways })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

/**
 * POST /api/v1/games/card-prices
 * Body: { games: Array<{ id: number; name: string; steamAppId?: string }> }
 * Returns: { [gameId]: CardPrice | null }
 * No auth required — results are public price data.
 */
export const cardPrices = async (req: Request, res: Response): Promise<void> => {
    try {
        const { games } = req.body as { games?: unknown }
        if (!Array.isArray(games) || games.length === 0) {
            res.status(400).json({ status: "400", message: "games must be a non-empty array", data: null })
            return
        }
        if (games.length > 50) {
            res.status(400).json({ status: "400", message: "Maximum 50 games per request", data: null })
            return
        }
        const prices = await getCardPricesService(
            games.slice(0, 50) as Array<{ id: number; name: string; steamAppId?: string; released?: string }>
        )
        res.status(200).json({ status: "200", message: "OK", data: prices })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

// ─── Legacy handlers — delegate to the current services ──────────────────────

export const getTrendingGames = async (req: Request, res: Response): Promise<void> => {
    console.warn("[API] Deprecated endpoint /trending — use /popular instead")
    const pageRaw = Number(req.query.page)
    const page    = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1
    try {
        const games = await getPopularGamesService(page)
        res.status(200).json({ status: "200", message: "OK", data: games })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const getGamesByGenre = async (req: Request, res: Response): Promise<void> => {
    console.warn("[API] Deprecated endpoint /genre — use /by-genre instead")
    const genre   = getString(req.query.genre)
    const pageRaw = Number(req.query.page)
    const page    = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1
    try {
        const games = await getByGenreService(genre, page)
        res.status(200).json({ status: "200", message: "OK", data: games })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}
