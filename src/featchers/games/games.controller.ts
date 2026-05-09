import { Request, Response } from "express"
import { getErrorInfo } from "../../shared/utils/AppError.js"
import {
    searchGamesService,
    getGameByIdService,
    getTrendingGamesService,
    getGamesByGenreService
} from "./games.service.js"

const getString = (val: unknown): string => {
    if (Array.isArray(val)) return String(val[0])
    return String(val ?? "")
}

export const searchGames = async (req: Request, res: Response): Promise<void> => {
    try {
        const q = getString(req.query.q)
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
        const page = Number(req.query.page) || 1
        const games = await getGamesByGenreService(genre, page)
        res.status(200).json({ status: "200", message: "OK", data: games })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}
