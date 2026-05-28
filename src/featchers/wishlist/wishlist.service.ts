import mongoose from "mongoose"
import WishlistModel from "./Wishlist.model.js"
import PriceWatch from "../pricewatch/PriceWatch.model.js"
import EventWatch from "../pricewatch/EventWatch.model.js"
import { AppError } from "../../shared/utils/AppError.js"
import userModel from "../users/User.model.js"
import axios from "axios"

const ONLINE_WINDOW_MS = 2 * 60 * 1000

export interface FriendWithGame {
    _id: string
    displayName: string
    avatarUrl: string | null
    isOnline: boolean
}

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

    // Seed watch entries asynchronously — don't block the response
    seedWatchesAsync(userId, game.gameId, game.gameName, game.gameSlug).catch(() => {})

    return item
}

export const removeFromWishlistService = async (userId: string, gameId: string) => {
    const result = await WishlistModel.findOneAndDelete({ userId, gameId })
    if (!result) {
        throw new AppError("Game not found in wishlist", 404)
    }

    // Clean up watch entries
    await Promise.all([
        PriceWatch.deleteOne({ userId, gameId }),
        EventWatch.deleteOne({ userId, gameId }),
    ]).catch(() => {})

    return { message: "Removed from wishlist" }
}

export const isInWishlistService = async (userId: string, gameId: string): Promise<boolean> => {
    const item = await WishlistModel.findOne({ userId, gameId })
    return !!item
}

export const listFriendsWithGameService = async (
    meId: string,
    gameId: string,
): Promise<FriendWithGame[]> => {
    const me = await userModel.findById(meId).select("following").lean()
    if (!me || !me.following?.length) return []

    const followingOids = me.following.map(id => new mongoose.Types.ObjectId(id.toString()))

    const rows = await WishlistModel
        .find({ userId: { $in: followingOids }, gameId })
        .select("userId")
        .lean()

    if (rows.length === 0) return []

    const users = await userModel
        .find({ _id: { $in: rows.map(r => r.userId) } })
        .select("_id name avatar lastSeenAt")
        .lean()

    return users.map(u => ({
        _id:         u._id.toString(),
        displayName: u.name,
        avatarUrl:   u.avatar ?? null,
        isOnline:    u.lastSeenAt
            ? Date.now() - new Date(u.lastSeenAt).getTime() < ONLINE_WINDOW_MS
            : false,
    }))
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function seedWatchesAsync(userId: string, gameId: string, gameName: string, gameSlug: string) {
    // Create both watch entries (upsert so concurrent adds don't crash)
    await Promise.all([
        PriceWatch.updateOne(
            { userId, gameId },
            { $setOnInsert: { userId, gameId, gameName, gameSlug, itadId: null, itadCachedAt: null, lastSeenPrice: null, lastSeenCut: null, lastNotifiedAt: null } },
            { upsert: true },
        ),
        EventWatch.updateOne(
            { userId, gameId },
            { $setOnInsert: { userId, gameId, gameName, gameSlug, steamAppId: null, lastSeenNewsGid: null, lastNotifiedAt: null } },
            { upsert: true },
        ),
    ])

    // Resolve Steam App ID from RAWG so the event cron can use it
    if (process.env.RAWG_API) {
        try {
            const { data } = await axios.get(
                `https://api.rawg.io/api/games/${gameId}`,
                { params: { key: process.env.RAWG_API }, timeout: 8000 }
            )
            const steamStore = (data.stores as Array<{ store: { slug: string }; url: string }> | undefined)
                ?.find(s => s.store?.slug === "steam")
            if (steamStore?.url) {
                const match = steamStore.url.match(/\/app\/(\d+)/)
                if (match) {
                    const steamAppId = parseInt(match[1], 10)
                    await EventWatch.updateOne({ userId, gameId }, { $set: { steamAppId } })
                }
            }
        } catch {
            // RAWG unavailable — steamAppId stays null, cron will skip event scanning
        }
    }
}
