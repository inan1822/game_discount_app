import { Request, Response } from "express"
import axios from "axios"
import WishlistModel from "../wishlist/Wishlist.model.js"
import PriceWatch from "../pricewatch/PriceWatch.model.js"
import EventWatch from "../pricewatch/EventWatch.model.js"

export const backfillWatches = async (req: Request, res: Response): Promise<void> => {
    try {
        const items = await WishlistModel.find({}).lean()
        let created = 0
        let skipped = 0

        for (const item of items) {
            const [pw, ew] = await Promise.all([
                PriceWatch.updateOne(
                    { userId: item.userId, gameId: item.gameId },
                    { $setOnInsert: {
                        userId:         item.userId,
                        gameId:         item.gameId,
                        gameName:       item.gameName,
                        gameSlug:       item.gameSlug,
                        steamAppId:     null,
                        itadId:         null,
                        itadCachedAt:   null,
                        lastSeenPrice:  null,
                        lastSeenCut:    null,
                        lastNotifiedAt: null,
                    }},
                    { upsert: true }
                ),
                EventWatch.updateOne(
                    { userId: item.userId, gameId: item.gameId },
                    { $setOnInsert: {
                        userId:          item.userId,
                        gameId:          item.gameId,
                        gameName:        item.gameName,
                        gameSlug:        item.gameSlug,
                        steamAppId:      null,
                        lastSeenNewsGid: null,
                        lastNotifiedAt:  null,
                    }},
                    { upsert: true }
                ),
            ])

            if (pw.upsertedCount > 0 || ew.upsertedCount > 0) created++
            else skipped++
        }

        // Fire-and-forget: resolve steamAppIds for newly created entries via RAWG
        resolveNewAppIdsAsync().catch(() => {})

        res.status(200).json({
            status:  "200",
            message: "Backfill complete",
            data:    { total: items.length, created, skipped },
        })
    } catch {
        res.status(500).json({ status: "500", message: "Backfill failed", data: null })
    }
}

async function resolveNewAppIdsAsync() {
    if (!process.env.RAWG_API) return

    const noAppId = await EventWatch.find({ steamAppId: null }).limit(100).lean()
    for (const ew of noAppId) {
        try {
            const { data } = await axios.get(
                `https://api.rawg.io/api/games/${ew.gameId}`,
                { params: { key: process.env.RAWG_API }, timeout: 8000 }
            )
            const steamStore = (data.stores as Array<{ store: { slug: string }; url: string }> | undefined)
                ?.find(s => s.store?.slug === "steam")
            if (steamStore?.url) {
                const match = steamStore.url.match(/\/app\/(\d+)/)
                if (match) {
                    const steamAppId = parseInt(match[1], 10)
                    await Promise.all([
                        EventWatch.updateOne({ _id: ew._id }, { $set: { steamAppId } }),
                        PriceWatch.updateOne(
                            { userId: ew.userId, gameId: ew.gameId },
                            { $set: { steamAppId } }
                        ),
                    ])
                }
            }
        } catch {
            // Skip — will be retried by the event cron's resolveMissingSteamAppIds
        }
        await new Promise(r => setTimeout(r, 300))
    }
}
