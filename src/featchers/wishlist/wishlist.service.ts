import WishlistModel from "./Wishlist.model.js"
import { AppError } from "../../shared/utils/AppError.js"

export const getWishlistService = async (userId: string) => {
    const items = await WishlistModel
        .find({ userId })
        .sort({ addedAt: -1 })
        .lean()
    return items
}

export const addToWishlistService = async (
    userId: string,
    game: { gameId: string; gameName: string; gameCover: string | null; gameSlug: string }
) => {
    const existing = await WishlistModel.findOne({ userId, gameId: game.gameId })
    if (existing) {
        throw new AppError("Game already in wishlist", 409)
    }

    const item = await WishlistModel.create({ userId, ...game })
    return item
}

export const removeFromWishlistService = async (userId: string, gameId: string) => {
    const result = await WishlistModel.findOneAndDelete({ userId, gameId })
    if (!result) {
        throw new AppError("Game not found in wishlist", 404)
    }
    return { message: "Removed from wishlist" }
}

export const isInWishlistService = async (userId: string, gameId: string): Promise<boolean> => {
    const item = await WishlistModel.findOne({ userId, gameId })
    return !!item
}
