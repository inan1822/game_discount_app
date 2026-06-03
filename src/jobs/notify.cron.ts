/**
 * notify.cron.ts
 * Runs two background loops:
 *   • Price scan  — every 30 min  — ITAD /games/overview/v2 → discount notifications
 *   • Event scan  — every 2 hours — Steam News API          → event notifications
 *
 * Each loop respects per-user notification prefs and deduplicates so the same
 * (userId, gameId, type) isn't notified more than once per 24 hours.
 */

import axios from "axios"
import mongoose from "mongoose"
import PriceWatch from "../featchers/pricewatch/PriceWatch.model.js"
import EventWatch from "../featchers/pricewatch/EventWatch.model.js"
import NotificationModel from "../featchers/notifications/Notification.model.js"
import userModel from "../featchers/users/User.model.js"
import { emitNotification } from "../shared/socket/io.js"

const ITAD_KEY    = process.env.ITAD_API_KEY
const ITAD_BASE   = "https://api.isthereanydeal.com"
const STEAM_NEWS  = "https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/"
const BATCH_SIZE  = 20   // max ITAD UUIDs per request
const DEDUP_HOURS = 24   // don't re-notify within this window

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function itadLookupByAppId(appId: number): Promise<string | null> {
    if (!ITAD_KEY) return null
    try {
        const { data } = await axios.get(`${ITAD_BASE}/games/lookup/v1`, {
            params: { key: ITAD_KEY, appid: appId },
            timeout: 8000,
        })
        return data?.found ? (data.game?.id ?? null) : null
    } catch {
        return null
    }
}

async function itadLookupByTitle(title: string): Promise<string | null> {
    if (!ITAD_KEY) return null
    try {
        const { data } = await axios.get(`${ITAD_BASE}/games/lookup/v1`, {
            params: { key: ITAD_KEY, title },
            timeout: 8000,
        })
        return data?.found ? (data.game?.id ?? null) : null
    } catch {
        return null
    }
}

async function itadOverview(ids: string[]): Promise<Map<string, { cut: number; price: number; shopName: string; url: string }>> {
    const result = new Map<string, { cut: number; price: number; shopName: string; url: string }>()
    if (!ITAD_KEY || ids.length === 0) return result
    try {
        const { data } = await axios.post(`${ITAD_BASE}/games/overview/v2`, ids, {
            params: { key: ITAD_KEY, country: "US" },
            headers: { "Content-Type": "application/json" },
            timeout: 15000,
        })
        // ITAD /games/overview/v2 returns { prices: [...], bundles: [...] } — NOT a
        // bare array. Iterating `data` directly threw "not iterable", which the catch
        // below swallowed, so NO discount was ever detected. Read data.prices.
        for (const entry of (data?.prices ?? [])) {
            const cur = entry.current
            if (cur?.cut > 0) {
                result.set(entry.id, {
                    cut:      cur.cut,
                    price:    cur.price?.amount ?? 0,
                    shopName: cur.shop?.name ?? "Unknown Store",
                    url:      cur.url ?? "",
                })
            }
        }
    } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.status === 429) {
            const retryAfter = Number(err.response.headers["retry-after"] ?? 60)
            console.warn(`[notify-cron] ITAD 429 — waiting ${retryAfter}s`)
            await sleep(retryAfter * 1000)
        }
    }
    return result
}

async function wasRecentlyNotified(userId: mongoose.Types.ObjectId | string, gameId: string, type: "discount" | "event"): Promise<boolean> {
    const since = new Date(Date.now() - DEDUP_HOURS * 60 * 60 * 1000)
    const count = await NotificationModel.countDocuments({
        userId: new mongoose.Types.ObjectId(String(userId)),
        gameId: Number(gameId),
        type,
        createdAt: { $gte: since },
    })
    return count > 0
}

async function createAndEmit(
    userId: mongoose.Types.ObjectId | string,
    type: "discount" | "event",
    title: string,
    body: string,
    gameId: string,
    gameSlug: string,
    link: string | null,
) {
    const notif = await NotificationModel.create({
        userId: new mongoose.Types.ObjectId(String(userId)),
        type,
        title,
        body,
        gameId:   Number(gameId),
        gameSlug,
        link,
        read: false,
    })
    emitNotification(String(userId), {
        _id:       notif._id,
        type,
        title,
        body,
        gameId:   Number(gameId),
        gameSlug,
        link,
        read:     false,
        createdAt: notif.createdAt,
    })
}

// ─── Price scan ───────────────────────────────────────────────────────────────

async function runPriceScan() {
    if (!ITAD_KEY) {
        console.warn("[notify-cron] ITAD_API_KEY not set — skipping price scan")
        return
    }
    console.log("[notify-cron] price scan started")

    try {
        const now     = new Date()
        const sevenDays = 7 * 24 * 60 * 60 * 1000

        // 1. Resolve ITAD UUIDs for entries that don't have one (or are stale)
        const needsLookup = await PriceWatch.find({
            $or: [
                { itadId: null },
                { itadCachedAt: { $lt: new Date(Date.now() - sevenDays) } },
            ]
        }).limit(60).lean()

        for (const pw of needsLookup) {
            // Prefer appid lookup (exact) over title lookup (fuzzy)
            const id = pw.steamAppId
                ? await itadLookupByAppId(pw.steamAppId)
                : await itadLookupByTitle(pw.gameName)
            if (id) {
                await PriceWatch.updateOne(
                    { _id: pw._id },
                    { $set: { itadId: id, itadCachedAt: now } }
                )
            }
            await sleep(200)
        }

        // 2. Get all entries that have a resolved ITAD UUID
        const watches = await PriceWatch.find({ itadId: { $ne: null } }).lean()
        if (watches.length === 0) return

        // 3. Group by itadId to avoid duplicate API calls for the same game
        const itadIdToWatches = new Map<string, typeof watches>()
        for (const w of watches) {
            if (!w.itadId) continue
            const list = itadIdToWatches.get(w.itadId) ?? []
            list.push(w)
            itadIdToWatches.set(w.itadId, list)
        }

        const uniqueItadIds = [...itadIdToWatches.keys()]

        // 4. Batch call ITAD /games/overview/v2 (max BATCH_SIZE per request)
        for (let i = 0; i < uniqueItadIds.length; i += BATCH_SIZE) {
            const batch   = uniqueItadIds.slice(i, i + BATCH_SIZE)
            const dealMap = await itadOverview(batch)

            for (const [itadId, deal] of dealMap) {
                const batchWatches = itadIdToWatches.get(itadId) ?? []

                for (const pw of batchWatches) {
                    // Fetch user prefs
                    const user = await userModel
                        .findById(pw.userId)
                        .select("notificationPrefs")
                        .lean()
                    if (!user?.notificationPrefs?.discounts) continue

                    const threshold = user.notificationPrefs.discountThreshold ?? 10
                    if (deal.cut < threshold) continue

                    // Dedup — skip if we already notified this user about this game today
                    if (await wasRecentlyNotified(pw.userId, pw.gameId, "discount")) continue

                    const title = `${pw.gameName} is ${deal.cut}% off on ${deal.shopName}`
                    const body  = `Now $${deal.price.toFixed(2)} — grab it before the deal ends.`

                    await createAndEmit(
                        pw.userId, "discount",
                        title, body,
                        pw.gameId, pw.gameSlug,
                        deal.url || null,
                    )

                    // Update last notified + last seen
                    await PriceWatch.updateOne({ _id: pw._id }, {
                        $set: {
                            lastSeenPrice:  deal.price,
                            lastSeenCut:    deal.cut,
                            lastNotifiedAt: now,
                        }
                    })
                }
            }

            if (i + BATCH_SIZE < uniqueItadIds.length) await sleep(500)
        }

        console.log(`[notify-cron] price scan done — checked ${uniqueItadIds.length} game(s)`)
    } catch (err) {
        console.error("[notify-cron] price scan error:", err)
    }
}

// ─── Event scan ───────────────────────────────────────────────────────────────

// Steam news feed tags we treat as "events" (exclude pure patch notes)
const EVENT_TAGS = new Set(["event", "events", "sale", "major_update", "community_event"])

async function fetchSteamNews(appId: number): Promise<Array<{ gid: number; title: string; url: string; tags: string[] }>> {
    try {
        const { data } = await axios.get(STEAM_NEWS, {
            params: { appid: appId, count: 5, maxlength: 300, format: "json" },
            timeout: 8000,
        })
        const items = data?.appnews?.newsitems ?? []
        return items.map((n: { gid: string; title: string; url: string; tags?: string }) => ({
            gid:   parseInt(n.gid, 10),
            title: n.title,
            url:   n.url,
            tags:  (n.tags ?? "").split(",").map((t: string) => t.trim().toLowerCase()),
        }))
    } catch {
        return []
    }
}

async function resolveMissingSteamAppIds() {
    if (!process.env.RAWG_API) return
    const noAppId = await EventWatch.find({ steamAppId: null }).limit(50).lean()
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
                        PriceWatch.updateOne({ userId: ew.userId, gameId: ew.gameId }, { $set: { steamAppId } }),
                    ])
                }
            }
        } catch {
            // RAWG unavailable for this game — will retry next event scan run
        }
        await sleep(300)
    }
}

async function runEventScan() {
    console.log("[notify-cron] event scan started")
    try {
        // Resolve steamAppId for any EventWatch entries that don't have one yet
        await resolveMissingSteamAppIds()

        // Get distinct steamAppIds (non-null)
        const distinctAppIds = await EventWatch.distinct("steamAppId", { steamAppId: { $ne: null } }) as number[]

        for (const appId of distinctAppIds) {
            const newsItems = await fetchSteamNews(appId)
            if (newsItems.length === 0) { await sleep(300); continue }

            // Find the latest gid in this batch
            const latestGid = Math.max(...newsItems.map(n => n.gid))

            // Get all event watchers for this steamAppId
            const watchers = await EventWatch.find({ steamAppId: appId }).lean()

            for (const ew of watchers) {
                const lastGid = ew.lastSeenNewsGid ?? 0

                // Only proceed if there are newer items than what we last notified about
                const newItems = newsItems.filter(n => n.gid > lastGid && (
                    n.tags.some(t => EVENT_TAGS.has(t)) || n.tags.length === 0
                ))
                if (newItems.length === 0) continue

                const user = await userModel
                    .findById(ew.userId)
                    .select("notificationPrefs")
                    .lean()
                if (!user?.notificationPrefs?.events) continue

                if (await wasRecentlyNotified(ew.userId, ew.gameId, "event")) continue

                // Notify about the most recent new item
                const item = newItems[0]
                const title = `${ew.gameName}: ${item.title}`
                const body  = "New in-game event or update — tap to learn more."

                await createAndEmit(
                    ew.userId, "event",
                    title, body,
                    ew.gameId, ew.gameSlug,
                    item.url,
                )

                await EventWatch.updateOne({ _id: ew._id }, {
                    $set: { lastSeenNewsGid: latestGid, lastNotifiedAt: new Date() }
                })
            }

            await sleep(300) // be gentle with Steam's public API
        }

        console.log(`[notify-cron] event scan done — checked ${distinctAppIds.length} app(s)`)
    } catch (err) {
        console.error("[notify-cron] event scan error:", err)
    }
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

const PRICE_INTERVAL_MS = 30 * 60 * 1000  // 30 min
const EVENT_INTERVAL_MS = 2  * 60 * 60 * 1000  // 2 hours

export function startNotifyCron() {
    // Run immediately on startup, then on schedule
    runPriceScan()
    runEventScan()

    setInterval(runPriceScan, PRICE_INTERVAL_MS)
    setInterval(runEventScan, EVENT_INTERVAL_MS)

    console.log("[notify-cron] scheduled — price every 30 min, events every 2 hours")
}
