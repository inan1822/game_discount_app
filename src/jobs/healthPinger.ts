/**
 * healthPinger.ts — Tier 2 link health monitoring
 *
 * Runs every 24h. Sends an HTTP HEAD request to every active GameManualLink.
 * HEAD = "are you alive?" — server replies with a status code, NO body.
 * Cost: ~1KB per link, negligible bandwidth. Scales to millions.
 *
 * Results:
 *   2xx / 3xx → healthStatus: "ok"
 *   4xx / 5xx → healthStatus: "dead"   (page gone, product removed)
 *   network err→ healthStatus: "unknown" (don't mark dead on transient errors)
 */

import axios from "axios"
import { GameManualLink } from "../featchers/games/GameManualLink.model.js"

const INTERVAL_MS  = 24 * 60 * 60 * 1000   // 24 hours
const BATCH_SIZE   = 50                      // process N links in parallel
const BATCH_PAUSE  = 200                     // ms between batches (be a good citizen)
const TIMEOUT_MS   = 6_000                   // 6s per HEAD request

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function pingOne(url: string): Promise<"ok" | "dead" | "unknown"> {
    try {
        const { status } = await axios.head(url, {
            timeout: TIMEOUT_MS,
            maxRedirects: 5,
            headers: {
                // Appear as a normal browser so stores don't block bot UAs
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            // Don't throw on 4xx/5xx — we want to record those as "dead"
            validateStatus: () => true,
        })
        if (status >= 200 && status < 400) return "ok"
        if (status >= 400)                  return "dead"
        return "unknown"
    } catch {
        // Network error, DNS failure, timeout — could be transient
        return "unknown"
    }
}

async function runHealthSweep() {
    const links = await GameManualLink.find({ isActive: true })
        .select("_id url healthStatus")
        .lean()

    if (links.length === 0) {
        console.log("[healthPinger] No active links to check")
        return
    }

    console.log(`[healthPinger] Pinging ${links.length} link(s)…`)
    const now      = new Date()
    let ok = 0, dead = 0, unknown = 0

    // Process in batches to avoid opening thousands of sockets at once
    for (let i = 0; i < links.length; i += BATCH_SIZE) {
        const batch = links.slice(i, i + BATCH_SIZE)

        await Promise.all(batch.map(async link => {
            const status = await pingOne(link.url)
            if (status !== link.healthStatus) {
                // Only write to DB when status changes (saves write ops)
                await GameManualLink.findByIdAndUpdate(link._id, {
                    healthStatus:    status,
                    lastHealthCheck: now,
                })
                if (status === "dead") {
                    console.log(`[healthPinger] ☠️  DEAD: ${link.url}`)
                }
            } else {
                // Still update the timestamp so admin can see "last checked"
                await GameManualLink.findByIdAndUpdate(link._id, { lastHealthCheck: now })
            }
            if (status === "ok")      ok++
            else if (status === "dead")   dead++
            else                          unknown++
        }))

        if (i + BATCH_SIZE < links.length) await sleep(BATCH_PAUSE)
    }

    console.log(`[healthPinger] Done — ✅ ${ok} ok · ☠️  ${dead} dead · ❓ ${unknown} unknown`)
}

export function startHealthPinger() {
    // First run after 60s (let the server finish booting)
    setTimeout(() => runHealthSweep(), 60_000)
    // Then every 24h
    setInterval(runHealthSweep, INTERVAL_MS)
    console.log("[healthPinger] scheduled — every 24 hours")
}
