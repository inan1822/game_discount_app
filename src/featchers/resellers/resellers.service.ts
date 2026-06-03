/**
 * Reseller pricing — pluggable providers for gray-market key marketplaces that
 * ITAD/CheapShark do NOT track (Driffle, G2A, Kinguin, …).
 *
 * Two capabilities per provider:
 *   1. buildAffiliateUrl(url)  — wrap a product URL with the affiliate/ref tag
 *                                (env-driven; passthrough until IDs are configured).
 *   2. priceFromUrl(url)       — fetch the product page and read its JSON-LD price.
 *                                Works for any reseller whose product page ships a
 *                                schema.org Product/Offer block (Driffle confirmed).
 *
 * Isolated from getGameDealsService on purpose — no risk to the ITAD/CheapShark path.
 * Auto-discovery (search a reseller by title) is intentionally NOT here yet: it's the
 * fragile/wrong-match-prone part. For now a provider prices a KNOWN product URL (e.g.
 * the one stored on a GameManualLink), so manual reseller links gain a live, auto-
 * refreshing price instead of a bare "View →".
 */
import axios from "axios"
import * as cheerio from "cheerio"

export interface ResellerOffer {
    provider:  string   // provider id, e.g. "driffle"
    storeName: string   // display label, e.g. "Driffle"
    price:     number   // current (lowest) price on the page
    currency:  string   // ISO currency from the page's JSON-LD (e.g. "USD", "ILS")
    inStock:   boolean
    url:       string   // affiliate-tagged product URL (or raw if no tag configured)
    sourceUrl: string   // the original product URL we priced
}

interface ResellerProvider {
    id:      string
    label:   string
    domains: string[]
    /** Wrap a product URL with the configured affiliate tag (passthrough if unset). */
    buildAffiliateUrl: (url: string) => string
}

// ─── Providers ────────────────────────────────────────────────────────────────
// Driffle only for now: its product pages expose clean schema.org JSON-LD, so we
// can read a live price with no API key. G2A/Kinguin block server-side fetches and
// need their own (approval-gated) APIs — add them here once those exist.
const PROVIDERS: ResellerProvider[] = [
    {
        id: "driffle", label: "Driffle", domains: ["driffle.com"],
        // Driffle's affiliate program runs on Awin. With AWIN ids set we build an
        // Awin deep link; otherwise return the raw product URL (never a broken link).
        buildAffiliateUrl: (url) => {
            const affid = process.env.AWIN_AFFID
            const mid   = process.env.AWIN_DRIFFLE_MID
            if (affid && mid) {
                return `https://www.awin1.com/cread.php?awinmid=${mid}&awinaffid=${affid}&ued=${encodeURIComponent(url)}`
            }
            return url
        },
    },
]

// ─── Domain safety (SSRF guard — only fetch known reseller product pages) ─────
function providerForUrl(rawUrl: string): ResellerProvider | null {
    let host: string
    try {
        const u = new URL(rawUrl)
        if (!["http:", "https:"].includes(u.protocol)) return null
        // Block private / loopback / link-local / cloud-metadata hosts.
        if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?|0\.0\.0\.0)/i.test(u.hostname)) return null
        host = u.hostname.replace(/^www\./, "")
    } catch {
        return null
    }
    return PROVIDERS.find(p => p.domains.some(d => host === d || host.endsWith("." + d))) ?? null
}

// ─── JSON-LD price extraction (schema.org Product / Offer / AggregateOffer) ───
function extractJsonLdOffer(html: string): { price: number; currency: string; inStock: boolean } | null {
    const $ = cheerio.load(html)
    for (const el of $('script[type="application/ld+json"]').toArray()) {
        const text = $(el).contents().text()
        if (!text) continue
        let json: unknown
        try { json = JSON.parse(text) } catch { continue }

        // JSON-LD can be a single node, an array, or a @graph wrapper.
        const root = json as { "@graph"?: unknown[] }
        const nodes: unknown[] = Array.isArray(json) ? json : (root["@graph"] ?? [json])

        for (const node of nodes) {
            const n = node as { offers?: unknown; availability?: unknown }
            if (!n.offers) continue
            const offer = (Array.isArray(n.offers) ? n.offers[0] : n.offers) as Record<string, unknown>
            if (!offer) continue

            // AggregateOffer (marketplace, e.g. Driffle) → lowPrice; plain Offer → price;
            // some wrap it in priceSpecification.
            const spec = (Array.isArray(offer.priceSpecification) ? offer.priceSpecification[0] : offer.priceSpecification) as Record<string, unknown> | undefined
            const rawPrice = offer.lowPrice ?? offer.price ?? spec?.price
            const rawCurr  = offer.priceCurrency ?? spec?.priceCurrency ?? "USD"
            const price = Number(rawPrice)
            if (!Number.isFinite(price)) continue

            const availability = JSON.stringify(offer.availability ?? n.availability ?? "")
            return { price, currency: String(rawCurr), inStock: /InStock|in_stock|true/i.test(availability) || availability === '""' }
        }
    }
    return null
}

// ─── Cache (resellers change less often than store deals) ─────────────────────
const offerCache = new Map<string, { offer: ResellerOffer | null; expiresAt: number }>()
const RESELLER_TTL = 60 * 60 * 1000   // 1 hour

/**
 * Fetch the live offer for a known reseller product URL. Domain-allowlisted,
 * cached, never throws. Returns null when the domain isn't a known reseller, the
 * page bot-blocks us, or it has no machine-readable price (common for G2A/Kinguin,
 * which is why those lean on their APIs / affiliate links instead).
 */
export async function getResellerOffer(rawUrl: string): Promise<ResellerOffer | null> {
    const provider = providerForUrl(rawUrl)
    if (!provider) return null

    const cached = offerCache.get(rawUrl)
    if (cached && cached.expiresAt > Date.now()) return cached.offer

    let offer: ResellerOffer | null = null
    try {
        const { data } = await axios.get<string>(rawUrl, {
            timeout: 6000,
            maxContentLength: 3_000_000,
            responseType: "text",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
            },
        })
        const parsed = extractJsonLdOffer(String(data))
        if (parsed) {
            offer = {
                provider:  provider.id,
                storeName: provider.label,
                price:     parsed.price,
                currency:  parsed.currency,
                inStock:   parsed.inStock,
                url:       provider.buildAffiliateUrl(rawUrl),
                sourceUrl: rawUrl,
            }
            console.log(`[Reseller] ${provider.label} "${rawUrl}" → ${parsed.currency} ${parsed.price}`)
        } else {
            console.log(`[Reseller] ${provider.label} "${rawUrl}" → no JSON-LD price (bot-blocked or unstructured)`)
        }
    } catch (err) {
        console.warn(`[Reseller] ${provider.label} fetch failed for "${rawUrl}":`, err instanceof Error ? err.message : String(err))
    }

    // Cache both hits AND misses (short-circuits repeated bot-blocked fetches).
    offerCache.set(rawUrl, { offer, expiresAt: Date.now() + (offer ? RESELLER_TTL : 10 * 60 * 1000) })
    return offer
}

/** True if a URL belongs to a supported reseller (for callers/validation). */
export function isSupportedResellerUrl(url: string): boolean {
    return providerForUrl(url) !== null
}
