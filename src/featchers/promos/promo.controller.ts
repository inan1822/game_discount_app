import { Request, Response, NextFunction } from "express"
import { PromoCode } from "./PromoCode.model.js"
import { Product } from "../products/Product.model.js"

// ── helpers ──────────────────────────────────────────────────────────────────

function calcDiscount(type: "percent" | "fixed", value: number, price: number): number {
  if (type === "percent") {
    return Math.min(price, Number(((price * value) / 100).toFixed(2)))
  }
  return Math.min(price, value)
}

// ── Admin: list all promo codes ───────────────────────────────────────────────
export async function listPromos(req: Request, res: Response, next: NextFunction) {
  try {
    const page  = Math.max(1, parseInt(String(req.query.page  || "1")))
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20"))))

    const [promos, total] = await Promise.all([
      PromoCode.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      PromoCode.countDocuments(),
    ])

    res.json({ promos, total, page, pages: Math.ceil(total / limit) })
  } catch (err) { next(err) }
}

// ── Admin: create promo code ──────────────────────────────────────────────────
export async function createPromo(req: Request, res: Response, next: NextFunction) {
  try {
    const { code, type, value, minOrderAmount, maxUses, expiresAt } =
      req.body as {
        code: string; type: "percent" | "fixed"; value: number
        minOrderAmount?: number; maxUses?: number | null; expiresAt?: string | null
      }

    if (!code || !type || value === undefined) {
      res.status(400).json({ message: "code, type, and value are required" }); return
    }
    if (type === "percent" && (value <= 0 || value > 100)) {
      res.status(400).json({ message: "Percent value must be 1–100" }); return
    }
    if (type === "fixed" && value <= 0) {
      res.status(400).json({ message: "Fixed value must be > 0" }); return
    }

    const promo = await PromoCode.create({
      code:           code.toUpperCase().trim(),
      type,
      value,
      minOrderAmount: minOrderAmount ?? 0,
      maxUses:        maxUses ?? null,
      expiresAt:      expiresAt ? new Date(expiresAt) : null,
    })

    res.status(201).json({ promo })
  } catch (err: unknown) {
    const mongoErr = err as { code?: number }
    if (mongoErr?.code === 11000) {
      res.status(409).json({ message: "A promo code with that name already exists" }); return
    }
    next(err)
  }
}

// ── Admin: update promo (toggle isActive, change any field) ──────────────────
export async function updatePromo(req: Request, res: Response, next: NextFunction) {
  try {
    const allowed = ["isActive", "maxUses", "expiresAt", "minOrderAmount", "value"]
    const patch: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in req.body) patch[key] = req.body[key]
    }
    if (Object.keys(patch).length === 0) {
      res.status(400).json({ message: "Nothing to update" }); return
    }

    const promo = await PromoCode.findByIdAndUpdate(req.params.id, patch, { new: true }).lean()
    if (!promo) { res.status(404).json({ message: "Promo not found" }); return }
    res.json({ promo })
  } catch (err) { next(err) }
}

// ── Admin: delete promo ───────────────────────────────────────────────────────
export async function deletePromo(req: Request, res: Response, next: NextFunction) {
  try {
    const promo = await PromoCode.findByIdAndDelete(req.params.id).lean()
    if (!promo) { res.status(404).json({ message: "Promo not found" }); return }
    res.json({ message: "Deleted" })
  } catch (err) { next(err) }
}

// ── User-facing: validate a promo code for a product ─────────────────────────
// POST /api/v1/checkout/validate-promo  { code, productId }
export async function validatePromo(req: Request, res: Response, next: NextFunction) {
  try {
    const { code, productId } = req.body as { code: string; productId: string }

    if (!code || !productId) {
      res.status(400).json({ message: "code and productId are required" }); return
    }

    const product = await Product.findOne({ _id: productId, isActive: true }).lean()
    if (!product) { res.status(404).json({ message: "Product not found" }); return }

    const promo = await PromoCode.findOne({ code: code.toUpperCase().trim() }).lean()
    if (!promo || !promo.isActive) {
      res.status(404).json({ message: "Invalid or inactive promo code" }); return
    }
    if (promo.expiresAt && promo.expiresAt < new Date()) {
      res.status(400).json({ message: "This promo code has expired" }); return
    }
    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      res.status(400).json({ message: "This promo code has reached its usage limit" }); return
    }
    if (product.price < promo.minOrderAmount) {
      res.status(400).json({
        message: `Minimum order amount for this code is $${promo.minOrderAmount.toFixed(2)}`,
      }); return
    }

    const discount    = calcDiscount(promo.type, promo.value, product.price)
    const finalAmount = Math.max(0, Number((product.price - discount).toFixed(2)))

    res.json({
      valid:        true,
      promoId:      promo._id.toString(),
      code:         promo.code,
      type:         promo.type,
      value:        promo.value,
      discount,
      originalPrice: product.price,
      finalAmount,
    })
  } catch (err) { next(err) }
}
