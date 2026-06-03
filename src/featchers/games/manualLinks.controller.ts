import { Request, Response, NextFunction } from "express"
import { GameManualLink, ManualLinkPlatform } from "./GameManualLink.model.js"
import { getResellerOffer, isSupportedResellerUrl } from "../resellers/resellers.service.js"

const PLATFORMS: ManualLinkPlatform[] = ["pc", "ps", "xbox", "switch", "all"]

/** Resolve to `fallback` if `p` doesn't settle within `ms` — keeps the response
 *  snappy on a cold cache; the real value still lands in the cache for next load. */
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms))])
}

// ── Admin: list manual links (optional ?rawgId= filter) ──────────────────────
export async function listManualLinks(req: Request, res: Response, next: NextFunction) {
  try {
    const filter: Record<string, unknown> = {}
    if (req.query.rawgId) filter.rawgId = String(req.query.rawgId)

    const links = await GameManualLink.find(filter).sort({ createdAt: -1 }).lean()
    res.json({ status: "200", message: "OK", data: links })
  } catch (err) { next(err) }
}

// ── Admin: create a manual link ───────────────────────────────────────────────
export async function createManualLink(req: Request, res: Response, next: NextFunction) {
  try {
    const { rawgId, rawgName, label, url, platform, price, storeIcon, note,
            subscriptionName, discountExpiresAt, isLimitedStock, inStock } = req.body as {
      rawgId?: string; rawgName?: string; label?: string; url?: string
      platform?: string; price?: number | null; storeIcon?: string; note?: string
      subscriptionName?: string | null; discountExpiresAt?: string | null
      isLimitedStock?: boolean; inStock?: boolean
    }

    if (!rawgId || !label || !url) {
      res.status(400).json({ status: "400", message: "rawgId, label, and url are required", data: null }); return
    }
    if (platform && !PLATFORMS.includes(platform as ManualLinkPlatform)) {
      res.status(400).json({ status: "400", message: `platform must be one of: ${PLATFORMS.join(", ")}`, data: null }); return
    }

    const link = await GameManualLink.create({
      rawgId:    String(rawgId).trim(),
      rawgName:  rawgName ?? "",
      label,
      url,
      platform:  (platform as ManualLinkPlatform) ?? "all",
      price:     price ?? null,
      storeIcon: storeIcon ?? "",
      note:      note ?? "",
      subscriptionName:  subscriptionName ?? null,
      discountExpiresAt: discountExpiresAt ? new Date(discountExpiresAt) : null,
      isLimitedStock:    isLimitedStock ?? false,
      inStock:           inStock ?? true,
      createdBy:         req.user!.id,
    })

    res.status(201).json({ status: "201", message: "Created", data: link })
  } catch (err) { next(err) }
}

// ── Admin: update a manual link (any allowed field, incl. isActive toggle) ────
export async function updateManualLink(req: Request, res: Response, next: NextFunction) {
  try {
    const allowed = ["label", "url", "platform", "price", "storeIcon", "note",
                     "subscriptionName", "discountExpiresAt", "isLimitedStock", "inStock", "isActive",
                     "aiTracking", "healthStatus", "aiTrackFailures"]
    const patch: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in req.body) patch[key] = req.body[key]
    }
    if ("platform" in patch && !PLATFORMS.includes(patch.platform as ManualLinkPlatform)) {
      res.status(400).json({ status: "400", message: `platform must be one of: ${PLATFORMS.join(", ")}`, data: null }); return
    }
    if (Object.keys(patch).length === 0) {
      res.status(400).json({ status: "400", message: "Nothing to update", data: null }); return
    }

    const link = await GameManualLink.findByIdAndUpdate(req.params.id, patch, { new: true }).lean()
    if (!link) { res.status(404).json({ status: "404", message: "Manual link not found", data: null }); return }
    res.json({ status: "200", message: "OK", data: link })
  } catch (err) { next(err) }
}

// ── Admin: delete a manual link ───────────────────────────────────────────────
export async function deleteManualLink(req: Request, res: Response, next: NextFunction) {
  try {
    const link = await GameManualLink.findByIdAndDelete(req.params.id).lean()
    if (!link) { res.status(404).json({ status: "404", message: "Manual link not found", data: null }); return }
    res.json({ status: "200", message: "Deleted", data: null })
  } catch (err) { next(err) }
}

// ── Public: active manual links for a game ───────────────────────────────────
// GET /api/v1/games/:rawgId/manual-links  — no auth.
// Auto-hides links whose discountExpiresAt is in the past, and out-of-stock links.
export async function getManualLinksForGame(req: Request, res: Response, next: NextFunction) {
  try {
    const now = new Date()
    const links = await GameManualLink.find({
      rawgId:   String(req.params.rawgId),
      isActive: true,
      inStock:  true,
      $or: [
        { discountExpiresAt: null },
        { discountExpiresAt: { $gt: now } },
      ],
    }).sort({ createdAt: -1 }).lean()

    // Enrich supported reseller links (Driffle) with a live, auto-refreshing price.
    // Cached in the service; soft-timeout per link so a slow reseller fetch never
    // blocks the response (the value still populates the cache for the next load).
    const enriched = await Promise.all(links.map(async (link) => {
      if (!isSupportedResellerUrl(link.url)) return link
      const offer = await withTimeout(getResellerOffer(link.url), 3000, null)
      if (!offer) return link
      return {
        ...link,
        liveOffer: {
          price:    offer.price,
          currency: offer.currency,
          inStock:  offer.inStock,
          url:      offer.url,   // affiliate-tagged when AWIN ids are set
        },
      }
    }))

    res.json({ status: "200", message: "OK", data: enriched })
  } catch (err) { next(err) }
}
