import { Request, Response } from "express"
import { getErrorInfo } from "../../shared/utils/AppError.js"
import {
    searchGamesService,
    getGameByIdService,
    getPopularGamesService,
    getNewGamesService,
    getTrendedGamesService,
    getForYouService,
    getTrendingGamesService,
    getGamesByGenreService,
    getGamePriceService,
    getGameDealsService,
    getFreeToPlayService,
    getHiddenGemsService,
    getDealOfDayService,
    getByGenreService,
} from "./games.service.js"

const getString = (val: unknown): string => {
    if (Array.isArray(val)) return String(val[0])
    return String(val ?? "")
}

export const searchGames = async (req: Request, res: Response): Promise<void> => {
    try {
        const q    = getString(req.query.q)
        const page = Number(req.query.page) || 1
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
        const page  = Number(req.query.page) || 1
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
        const page  = Number(req.query.page) || 1
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
        const page  = Number(req.query.page) || 1
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

/** Deals — all store deals for a game (proxy to CheapShark, avoids browser CORS) */
export const getGameDeals = async (req: Request, res: Response): Promise<void> => {
    try {
        const title = getString(req.query.title)
        if (!title) {
            res.status(400).json({ status: "400", message: "title is required", data: null })
            return
        }
        const deals = await getGameDealsService(title)
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
        const genre = getString(req.query.genre)
        const page  = Number(req.query.page) || 1
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

// ─── Legacy handlers (kept for backward compat) ───────────────────────────────

export const getTrendingGames = async (_req: Request, res: Response): Promise<void> => {
    try {
        const games = await getTrendingGamesService()
        res.status(200).json({ status: "200", message: "OK", data: games })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const getGamesByGenre = async (req: Request, res: Response): Promise<void> => {
    try {
        const genre = getString(req.query.genre)
        const page  = Number(req.query.page) || 1
        const games = await getGamesByGenreService(genre, page)
        res.status(200).json({ status: "200", message: "OK", data: games })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}
