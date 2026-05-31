/**
 * llm.controller.ts
 * Admin-only Claude-powered AI assistant for DisLow.
 *
 * Capabilities:
 *   • Products  — help build product listings from game data
 *   • Game Links — paste a store URL → Claude fetches & extracts all fields
 *   • Analytics — revenue-optimisation advice backed by live DB stats
 *
 * Security:
 *   • Text-only input (no base64, no file blobs)
 *   • URL fetching is server-side only, domain-allowlisted (no SSRF)
 *   • Rate-limited via adminRouter's existing express-rate-limit
 *   • ANTHROPIC_API_KEY never leaves the server
 */

import Anthropic from "@anthropic-ai/sdk"
import { Request, Response, NextFunction } from "express"
import axios from "axios"
import * as cheerio from "cheerio"
import { Product } from "../products/Product.model.js"
import { GameManualLink } from "../games/GameManualLink.model.js"

// ─── Client ───────────────────────────────────────────────────────────────────

function getClient() {
    if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error("ANTHROPIC_API_KEY is not set")
    }
    return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

// ─── Domain allowlist ─────────────────────────────────────────────────────────
// Server-side URL fetching is strictly limited to known game store domains.
// Prevents SSRF and keeps content analysis focused on relevant stores.

const SAFE_DOMAINS = new Set([
    // ── Major PC digital storefronts ──────────────────────────────────────────
    "store.steampowered.com", "gog.com", "epicgames.com", "humblebundle.com",
    "fanatical.com", "greenmangaming.com", "gamersgate.com", "gamebillet.com",
    "indiegala.com", "allyouplay.com", "2game.com", "wingamestore.com",
    "gamesload.com", "nuuvem.com", "dlgamer.com", "k4g.com", "voidu.com",
    "gamesplanet.com", "us.gamesplanet.com", "uk.gamesplanet.com",
    "de.gamesplanet.com", "fr.gamesplanet.com",

    // ── Developer / publisher official stores ─────────────────────────────────
    "ea.com", "origin.com",                         // EA
    "store.ubisoft.com", "ubisoftconnect.com",      // Ubisoft
    "battle.net", "blizzard.com",                   // Blizzard
    "rockstargames.com",                            // Rockstar
    "bethesda.net",                                 // Bethesda
    "itch.io",                                      // Indie / self-published
    "mojang.com",                                   // Minecraft
    "paradoxinteractive.com",                       // Paradox
    "store.square-enix.com", "square-enix.com",     // Square Enix
    "store.sega.com", "sega.com",                   // SEGA
    "2k.com",                                       // 2K Games
    "focusentertainment.com",                       // Focus Entertainment
    "plaion.com",                                   // PLAION (ex Deep Silver)
    "cdprojektred.com",                             // CD PROJEKT RED
    "activision.com", "blizzard.com",               // Activision / Blizzard
    "take-two.com",                                 // Take-Two Interactive

    // ── Console stores ────────────────────────────────────────────────────────
    "store.playstation.com", "playstation.com",
    "xbox.com", "microsoft.com",
    "nintendo.com",

    // ── Key marketplaces — established, have buyer protection & dispute systems
    "g2a.com",           // largest global marketplace
    "kinguin.net",       // established European marketplace
    "eneba.com",         // fast-growing, buyer protection
    "cdkeys.com",        // popular UK-based, legitimate
    "driffle.com",       // growing marketplace, ILS/regional pricing
    "instant-gaming.com",// popular EU marketplace, verified sellers
    "gamivo.com",        // established marketplace, price comparison built-in
    "mmoga.com",         // German/EU marketplace, long-standing

    // ── Price comparison aggregators (link to stores, don't sell themselves) ──
    "allkeyshop.com",    // aggregates prices from 40+ stores
    "isthereanydeal.com",// major price comparison, already in DisLow
])

function isDomainSafe(url: string): boolean {
    try {
        const { protocol, hostname } = new URL(url)
        if (!["http:", "https:"].includes(protocol)) return false
        // Block private/loopback addresses
        if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(hostname)) return false
        const bare = hostname.replace(/^www\./, "")
        if (SAFE_DOMAINS.has(bare)) return true
        // Allow subdomains of known stores
        for (const safe of SAFE_DOMAINS) {
            if (bare.endsWith("." + safe)) return true
        }
        return false
    } catch {
        return false
    }
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
    {
        name: "fetch_url_content",
        description: `Fetch and extract readable text from a game store URL.
Only works with known game store domains (Steam, GOG, Epic, PlayStation Store, Xbox, etc.).
Returns the page title, price if visible, and up to 3000 chars of body text.
Use this to analyse a product listing and extract game/store information.`,
        input_schema: {
            type: "object" as const,
            properties: {
                url: { type: "string", description: "Full URL to fetch (must be https://, known game store)" },
            },
            required: ["url"],
        },
    },
    {
        name: "search_rawg",
        description: "Search the RAWG game database by title. Returns up to 5 matching games with their RAWG IDs, names, release dates, and cover images. Use this to confirm the game name and get its RAWG ID for DisLow.",
        input_schema: {
            type: "object" as const,
            properties: {
                query: { type: "string", description: "Game title to search for" },
            },
            required: ["query"],
        },
    },
    {
        name: "get_store_stats",
        description: "Get live DisLow store statistics for analytics advice (product counts, active game links, category breakdown).",
        input_schema: {
            type: "object" as const,
            properties: {},
        },
    },
]

// ─── Tool execution ───────────────────────────────────────────────────────────

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
    switch (name) {
        case "fetch_url_content": {
            const url = String(input.url ?? "")
            if (!isDomainSafe(url)) {
                return JSON.stringify({ error: "Domain not in the trusted game-store allowlist. Only known stores can be fetched." })
            }
            try {
                const { data, request: req } = await axios.get(url, {
                    timeout: 5_000,   // fail fast — scrapers like G2A often block after 3-4s anyway
                    maxContentLength: 2_000_000,  // 2MB — GOG/Steam pages can be large; body text still truncated to 3000 chars
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                        "Accept-Language": "en-US,en;q=0.9",
                    },
                    responseType: "text",
                })
                const $ = cheerio.load(String(data))
                $("script, style, nav, header, footer, noscript, [aria-hidden]").remove()

                const title   = $("title").text().trim()
                const h1      = $("h1").first().text().trim()
                // Try to pick up JSON-LD structured data (price, availability)
                let jsonLd: Record<string, unknown> = {}
                try {
                    const ldText = $("script[type='application/ld+json']").first().text()
                    if (ldText) jsonLd = JSON.parse(ldText)
                } catch { /* ignore */ }

                const bodyText = $("body").text()
                    .replace(/\s+/g, " ")
                    .replace(/[^\x20-\x7E\n]/g, "")
                    .trim()
                    .slice(0, 3000)

                return JSON.stringify({ url, title, h1, jsonLd, bodyText })
            } catch (err) {
                const msg = axios.isAxiosError(err)
                    ? `HTTP ${err.response?.status ?? "error"}: ${err.message}`
                    : String(err)
                return JSON.stringify({ error: `Failed to fetch URL: ${msg}` })
            }
        }

        case "search_rawg": {
            const query = String(input.query ?? "")
            try {
                const { data } = await axios.get("https://api.rawg.io/api/games", {
                    params: { key: process.env.RAWG_API, search: query, page_size: 5 },
                    timeout: 8000,
                })
                const games = (data.results ?? []).map((g: { id: number; name: string; released: string; background_image: string | null; genres: { name: string }[] }) => ({
                    id:      g.id,
                    name:    g.name,
                    released: g.released,
                    cover:   g.background_image,
                    genres:  g.genres?.map((x) => x.name),
                }))
                return JSON.stringify({ games })
            } catch {
                return JSON.stringify({ error: "RAWG search failed" })
            }
        }

        case "get_store_stats": {
            const [
                totalProducts,
                activeProducts,
                activeLinks,
                linksByPlatform,
                categoryCounts,
            ] = await Promise.all([
                Product.countDocuments(),
                Product.countDocuments({ isActive: true }),
                GameManualLink.countDocuments({ isActive: true }),
                GameManualLink.aggregate([
                    { $match: { isActive: true } },
                    { $group: { _id: "$platform", count: { $sum: 1 } } },
                ]),
                Product.aggregate([
                    { $group: { _id: "$category", count: { $sum: 1 } } },
                ]),
            ])
            return JSON.stringify({ totalProducts, activeProducts, activeLinks, linksByPlatform, categoryCounts })
        }

        default:
            return JSON.stringify({ error: `Unknown tool: ${name}` })
    }
}

// ─── System prompts ───────────────────────────────────────────────────────────

const BASE_RULES = `You are DisLow Admin AI — an assistant built into the DisLow game deal finder admin panel.
STRICT RULES (never violate):
1. You ONLY accept plain text. Reject any request to process images, PDFs, base64 data, or binary.
2. You fetch URLs from any game store or key marketplace that the fetch_url_content tool accepts.
   This EXPLICITLY includes: G2A, Kinguin, Eneba, CDKeys — these are approved DisLow partner stores
   already shown in the app's Discounts tab. Never reject them. Never warn the admin about them.
   If fetch_url_content returns an error for a domain, report that error — do NOT invent your own domain policy.
3. Never generate harmful code, shell commands, or anything unrelated to game store administration.
4. Be concise. No filler text. Respond like a senior engineer who respects the admin's time.`

const CONTEXT_PROMPTS: Record<string, string> = {
    "game-links": `${BASE_RULES}

TASK: Help the admin add manual store/website links to games in the Discounts tab.

HOW THE FILL FORM FEATURE WORKS:
When the admin pastes a store URL directly in this chat (and nothing else), the frontend
automatically calls a dedicated analyze endpoint and shows a green "📋 Fill Form" button
that opens the form pre-populated. You do NOT need to output JSON tables or field lists.

WHEN ADMIN ASKS YOU TO "fill the form", "add a link", "create a game link":
Respond with EXACTLY this (no tables, no JSON):
"Just paste the store URL directly in this chat (e.g. https://store.steampowered.com/app/123/) and I'll analyze it. A green **📋 Fill Form** button will appear — click it and the form opens pre-filled automatically."

WHEN ADMIN GIVES A URL:
Use fetch_url_content + search_rawg, then give a 2-line summary of what was found.
The frontend handles the rest via the Fill Form button.

NEVER:
- Ask for API endpoints, tokens, or credentials
- Output long JSON tables or field-by-field instructions
- Claim you cannot fill the form — the Fill Form button does it automatically`,

    "products": `${BASE_RULES}

TASK: Help the admin create products in the DisLow store.
Products fields: name, description, imageUrl, platform (PC/PS5/Xbox/Switch/Other), category (gamekey/giftcard/subscription/dlc/currency), price.
When given a game name:
1. Use search_rawg to find the game and its cover image
2. Suggest realistic pricing (based on typical key-market prices you know)
3. Suggest a platform and category
4. Write a compelling 1-sentence product description
Return a JSON suggestion block.`,

    "analytics": `${BASE_RULES}

TASK: Be a revenue-optimisation advisor for the DisLow virtual game key store.
Use get_store_stats first to see real data, then give 3–5 specific, data-driven recommendations.
Focus on: pricing strategy, featured products, which categories to push, timing (e.g. "launch a PS5 DLC bundle before the next sale season"), missing inventory gaps, subscription value propositions.
No generic advice. Reference actual numbers from the stats.`,
}

// ─── Analyze link endpoint (non-streaming, returns JSON) ─────────────────────
// POST /admin/llm/analyze-link  { url: string }
// Fetches the store page + searches RAWG, returns structured game link data.

export async function analyzeLink(req: Request, res: Response, next: NextFunction) {
    try {
        const { url } = req.body as { url?: string }
        if (!url || typeof url !== "string") {
            res.status(400).json({ error: "url is required" }); return
        }
        if (!isDomainSafe(url)) {
            res.status(400).json({ error: "Domain not in the trusted store allowlist" }); return
        }

        const client = getClient()

        // Run both tools in a single Claude call via parallel tool use
        const response = await client.messages.create({
            model:      "claude-sonnet-4-6",
            max_tokens: 1024,
            thinking:   { type: "disabled" },
            tools: TOOLS,
            tool_choice: { type: "auto" },
            system: `You are a game store data extractor. Given a store URL:
1. Use fetch_url_content to get the page
2. Use search_rawg to find the game
3. Return ONLY a JSON object (no markdown, no explanation) with these exact fields:
{
  "rawgId": number | null,
  "rawgName": string | null,
  "label": string,
  "platform": "pc" | "ps" | "xbox" | "switch" | "all",
  "price": number | null,
  "storeIcon": "https://www.google.com/s2/favicons?domain=DOMAIN&sz=128",
  "subscriptionName": string | null,
  "discountExpiresAt": "YYYY-MM-DD" | null,
  "note": string
}
Rules: storeIcon domain = the URL's domain. label = "StoreName — GameTitle". note = brief context or "".`,
            messages: [{ role: "user", content: `Analyze this store URL and extract game link data: ${url}` }],
        })

        // Run the agentic tool loop
        let messages: Anthropic.MessageParam[] = [
            { role: "user", content: `Analyze this store URL and extract game link data: ${url}` }
        ]
        let currentResponse = response
        let iterations = 0

        while (currentResponse.stop_reason === "tool_use" && iterations < 4) {
            iterations++
            messages.push({ role: "assistant", content: currentResponse.content })
            const toolResults: Anthropic.ToolResultBlockParam[] = []
            for (const block of currentResponse.content) {
                if (block.type === "tool_use") {
                    const result = await executeTool(block.name, block.input as Record<string, unknown>)
                    toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result })
                }
            }
            messages.push({ role: "user", content: toolResults })
            currentResponse = await client.messages.create({
                model: "claude-sonnet-4-6",
                max_tokens: 1024,
                thinking: { type: "disabled" },
                tools: TOOLS,
                system: `You are a game store data extractor. Given a store URL:
1. Use fetch_url_content to get the page
2. Use search_rawg to find the game
3. Return ONLY a JSON object (no markdown, no explanation) with these exact fields:
{
  "rawgId": number | null,
  "rawgName": string | null,
  "label": string,
  "platform": "pc" | "ps" | "xbox" | "switch" | "all",
  "price": number | null,
  "storeIcon": "https://www.google.com/s2/favicons?domain=DOMAIN&sz=128",
  "subscriptionName": string | null,
  "discountExpiresAt": "YYYY-MM-DD" | null,
  "note": string
}
Rules: storeIcon domain = the URL's domain. label = "StoreName — GameTitle". note = brief context or "".`,
                messages,
            })
        }

        // Extract the JSON from the final text response.
        // Try markdown code block first, then bare JSON object (non-greedy).
        const finalText = currentResponse.content
            .filter(b => b.type === "text")
            .map(b => (b as Anthropic.TextBlock).text)
            .join("")

        const codeBlockMatch = finalText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
        const bareMatch      = finalText.match(/\{[\s\S]*?\}/)   // non-greedy
        const rawJson        = (codeBlockMatch?.[1] ?? bareMatch?.[0] ?? "").trim()

        if (!rawJson) {
            res.status(422).json({ error: "Could not extract JSON from Claude response", raw: finalText }); return
        }

        const data = JSON.parse(rawJson)
        res.json({ status: "200", message: "OK", data })

    } catch (err) { next(err) }
}

// ─── Chat endpoint (streaming SSE) ───────────────────────────────────────────

export async function adminLLMChat(req: Request, res: Response, next: NextFunction) {
    try {
        const { message, context, history } = req.body as {
            message:  string
            context:  string
            history?: Anthropic.MessageParam[]
        }

        // ── Input validation ──
        if (!message || typeof message !== "string") {
            res.status(400).json({ error: "message must be a non-empty string" }); return
        }
        if (message.length > 3000) {
            res.status(400).json({ error: "Message too long (max 3000 chars)" }); return
        }
        // Block base64 payloads (file content sneaked into text)
        if (/data:[a-z]+\/[a-z]+;base64,/i.test(message)) {
            res.status(400).json({ error: "File content is not accepted — text only" }); return
        }
        const systemPrompt = CONTEXT_PROMPTS[context] ?? CONTEXT_PROMPTS["analytics"]
        const client       = getClient()

        // ── SSE headers ──
        res.setHeader("Content-Type",  "text/event-stream")
        res.setHeader("Cache-Control", "no-cache")
        res.setHeader("Connection",    "keep-alive")
        res.setHeader("X-Accel-Buffering", "no") // nginx: disable proxy buffering

        const send = (obj: Record<string, unknown>) => {
            res.write(`data: ${JSON.stringify(obj)}\n\n`)
        }

        // ── Agentic loop with prompt caching ──
        let messages: Anthropic.MessageParam[] = [
            ...(Array.isArray(history) ? history : []),
            { role: "user", content: message },
        ]

        let continueLoop = true
        while (continueLoop) {
            const stream = client.messages.stream({
                model:    "claude-sonnet-4-6",   // Tier 4: Sonnet for chat (3× cheaper than Opus)
                max_tokens: 2048,
                thinking: { type: "disabled" },  // no thinking needed for extraction tasks — faster responses
                system: [
                    {
                        type:          "text",
                        text:          systemPrompt,
                        cache_control: { type: "ephemeral" },  // cache the stable system prompt
                    },
                ],
                tools:    TOOLS,
                messages,
            })

            // Stream text deltas to client in real-time
            for await (const event of stream) {
                if (
                    event.type === "content_block_delta" &&
                    event.delta.type === "text_delta"
                ) {
                    send({ type: "delta", text: event.delta.text })
                }
            }

            const final = await stream.finalMessage()
            messages.push({ role: "assistant", content: final.content })

            if (final.stop_reason !== "tool_use") {
                continueLoop = false
            } else {
                // Execute tools and feed results back
                const toolResults: Anthropic.ToolResultBlockParam[] = []
                for (const block of final.content) {
                    if (block.type === "tool_use") {
                        send({ type: "tool_call", name: block.name })
                        const result = await executeTool(block.name, block.input as Record<string, unknown>)
                        toolResults.push({
                            type:         "tool_result",
                            tool_use_id:  block.id,
                            content:      result,
                        })
                    }
                }
                messages.push({ role: "user", content: toolResults })
            }
        }

        // Send final history so frontend can continue the conversation
        send({ type: "done", history: messages })
        res.end()

    } catch (err) {
        // SSE already opened — can't send HTTP 500, write error event instead
        if (res.headersSent) {
            res.write(`data: ${JSON.stringify({ type: "error", message: String(err) })}\n\n`)
            res.end()
        } else {
            next(err)
        }
    }
}
