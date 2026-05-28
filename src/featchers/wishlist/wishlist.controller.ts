import { Request, Response } from "express"
import { getErrorInfo } from "../../shared/utils/AppError.js"
import {
    getWishlistService,
    addToWishlistService,
    removeFromWishlistService,
    isInWishlistService,
    listFriendsWithGameService,
} from "./wishlist.service.js"

export const getWishlist = async (req: Request, res: Response): Promise<void> => {
    try {
        const items = await getWishlistService(req.user!.id)
        res.status(200).json({ status: "200", message: "OK", data: items })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const addToWishlist = async (req: Request, res: Response): Promise<void> => {
    try {
        const { gameId, gameName, gameCover, gameSlug } = req.body
        const item = await addToWishlistService(req.user!.id, { gameId: String(gameId), gameName: String(gameName), gameCover: gameCover ? String(gameCover) : null, gameSlug: String(gameSlug) })
        res.status(201).json({ status: "201", message: "Added to wishlist", data: item })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const removeFromWishlist = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await removeFromWishlistService(req.user!.id, String(req.params.gameId))
        res.status(200).json({ status: "200", message: result.message, data: null })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const checkWishlist = async (req: Request, res: Response): Promise<void> => {
    try {
        const inWishlist = await isInWishlistService(req.user!.id, String(req.params.gameId))
        res.status(200).json({ status: "200", message: "OK", data: { inWishlist } })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const getFriendsWithGame = async (req: Request, res: Response): Promise<void> => {
    try {
        const friends = await listFriendsWithGameService(req.user!.id, String(req.params.gameId))
        res.status(200).json({ status: "200", message: "OK", data: friends })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}
