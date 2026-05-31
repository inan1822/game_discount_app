/**
 * stockMonitor.ts
 * Runs every 8 hours. For each active GameManualLink with isLimitedStock=true,
 * fetches the page and asks Claude (Haiku — cheap batch model) whether the item
 * is still in stock and what the current price is.
 *
 * ⚠️ LIMITATION: Most major stores (Xbox, PS Store, Steam) use JavaScript rendering.
 * A plain HTTP fetch gets the page shell, not live product data. This monitor works
 * best for smaller stores with server-rendered HTML (itch.io, indie dev stores, etc.)
 * and for sites that embed JSON-LD structured data.
 *
 * For Steam/ITAD-tracked games, the existing notify.cron.ts already handles price
 * changes — this monitor fills in the gaps for stores outside ITAD's coverage.
 */

import Anthropic from "@anthropic-ai/sdk"
import axios      from "axios"
import * as cheerio from "cheerio"
import { GameManualLink } from "../featchers/games/GameManualLink.model.js"

const INTERVAL_MS = 8 * 60 * 60 * 1000   // 8 hours

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// ─── Single-link check ────────────────────────────────────────────────────────

const MAX_FAILURES = 3   // auto-disable after this many consecutive null results

async function checkLink(link: { _id: unknown; label: string; url: string; price: number | null; inStock: boolean }) {
    // 1. Fetch the page (best-effort — JS-rendered pages will return sparse HTML)
    let pageText = ""
    let jsonLd: Record<string, unknown> = {}
    try {
        const { data } = await axios.get(link.url, {
            timeout: 12_000,
            maxContentLength: 300_000,
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; DisLow-StockBot/1.0)",
                "Accept-Language": "en-US,en;q=0.9",
            },
            responseType: "text",
        })
        const $ = cheerio.load(String(data))
        $("script[src], style, nav, header, footer, noscript").remove()

        // JSON-LD often contains price + availability even when the page is React-rendered
        try {
            const ld = $("script[type='application/ld+json']").first().text()
            if (ld) jsonLd = JSON.parse(ld)
        } catch { /* ignore */ }

        pageText = $("body").text().replace(/\s+/g, " ").trim().slice(0, 2500)
    } catch {
        // Network or HTTP error — skip silently; don't mark as out-of-stock on network blips
        return
    }

    if (!pageText && Object.keys(jsonLd).length === 0) return  // nothing to parse

    // 2. Ask Haiku (cheap model) to extract stock + price
    if (!process.env.ANTHROPIC_API_KEY) return
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    let rawAnswer = ""
    try {
        const response = await client.messages.create({
            model:      "claude-haiku-4-5",   // cheap model for batch monitoring
            max_tokens: 128,
            messages: [
                {
                    role: "user",
                    content: `You are checking a game store listing.
Store: ${link.label}
URL: ${link.url}
${Object.keys(jsonLd).length ? `JSON-LD data: ${JSON.stringify(jsonLd).slice(0, 800)}` : ""}
Page text (may be partial if JS-rendered): ${pageText.slice(0, 1500)}

Respond with ONLY valid JSON (no markdown, no explanation):
{"inStock": true|false|null, "priceUSD": <number or null>}
null means you cannot determine from the available data.`,
                },
            ],
        })
        rawAnswer = response.content[0]?.type === "text" ? response.content[0].text : ""
    } catch (err) {
        console.error(`[stockMonitor] Claude error for ${link.label}:`, err)
        return
    }

    // 3. Parse and apply changes
    type Extracted = { inStock?: boolean | null; priceUSD?: number | null }
    let extracted: Extracted = {}
    try {
        const match = rawAnswer.match(/\{[^}]+\}/)
        if (match) extracted = JSON.parse(match[0]) as Extracted
    } catch {
        return  // unparseable — skip
    }

    const gotUsefulData = extracted.inStock !== null || extracted.priceUSD !== null

    if (!gotUsefulData) {
        // Haiku got nothing — site is likely JS-rendered or blocking scrapes.
        // Increment failure counter and auto-disable after MAX_FAILURES.
        const updated = await GameManualLink.findByIdAndUpdate(
            link._id,
            { $inc: { aiTrackFailures: 1 } },
            { new: true }
        ).select("aiTrackFailures").lean() as { aiTrackFailures: number } | null

        const failures = updated?.aiTrackFailures ?? 0
        if (failures >= MAX_FAILURES) {
            await GameManualLink.findByIdAndUpdate(link._id, {
                $set: { aiTracking: false }
            })
            console.log(`[stockMonitor] 🚫 Auto-disabled AI tracking for "${link.label}" — ${failures} consecutive null results. This site is likely JS-rendered or blocking scrapes.`)
        } else {
            console.log(`[stockMonitor] ❓ No data from "${link.label}" (${failures}/${MAX_FAILURES} failures)`)
        }
        return
    }

    // Got useful data — reset failure counter
    const patch: Partial<{ inStock: boolean; price: number; aiTrackFailures: number }> = {
        aiTrackFailures: 0,
    }
    let changed = false

    if (extracted.inStock === false) {
        patch.inStock = false
        changed = true
        console.log(`[stockMonitor] ⚠️  OUT OF STOCK: ${link.label}`)
    }

    if (
        typeof extracted.priceUSD === "number" &&
        extracted.priceUSD > 0 &&
        Math.abs(extracted.priceUSD - (link.price ?? 0)) > 0.5
    ) {
        patch.price = extracted.priceUSD
        changed = true
        console.log(`[stockMonitor] 💰 Price changed: ${link.label} $${link.price} → $${extracted.priceUSD}`)
    }

    if (changed || patch.aiTrackFailures === 0) {
        await GameManualLink.findByIdAndUpdate(link._id, { $set: patch })
    }
}

// ─── Main sweep ───────────────────────────────────────────────────────────────

async function runStockSweep() {
    if (!process.env.ANTHROPIC_API_KEY) {
        console.warn("[stockMonitor] ANTHROPIC_API_KEY not set — skipping")
        return
    }

    // Only check links the admin has opted into AI tracking.
    // Default is aiTracking: false — zero Haiku spend unless admin enables it per link.
    const links = await GameManualLink.find({
        aiTracking: true,
        isActive:   true,
    }).select("_id label url price inStock").lean()

    if (links.length === 0) {
        console.log("[stockMonitor] No AI-tracked links to check (all aiTracking=false) — $0 spent")
        return
    }

    console.log(`[stockMonitor] Checking ${links.length} limited-stock link(s)…`)

    for (const link of links) {
        await checkLink(link)
        await sleep(3_000)  // gentle pacing — 3 s between requests
    }

    console.log("[stockMonitor] Sweep complete")
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

export function startStockMonitor() {
    // First run after 30 s (give the server time to finish startup)
    setTimeout(() => runStockSweep(), 30_000)
    // Then every 8 hours
    setInterval(runStockSweep, INTERVAL_MS)
    console.log("[stockMonitor] scheduled — every 8 hours")
}
