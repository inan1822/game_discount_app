import { Request, Response, NextFunction } from "express"
import { Product } from "../products/Product.model.js"

// ── GET /api/v1/store/products ──────────────────────────────────────────────
// Public — no auth. Returns only isActive products.
export const listStoreProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1)
    const limit = Math.min(50,  parseInt(req.query.limit as string) || 20)
    const skip  = (page - 1) * limit

    const filter: Record<string, unknown> = { isActive: true }

    if (req.query.search) {
      filter.$or = [
        { name: new RegExp(req.query.search as string, "i") },
        { rawgGameName: new RegExp(req.query.search as string, "i") },
      ]
    }
    if (req.query.category) filter.category = req.query.category
    if (req.query.platform) filter.platform = req.query.platform

    const [products, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ])

    return res.status(200).json({
      status: "200",
      message: "ok",
      data: { products, total, page, pages: Math.ceil(total / limit) },
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/v1/store/products/by-game/:rawgGameId ─────────────────────────
export const getProductsByGame = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rawgGameId } = req.params
    const products = await Product.find({
      rawgGameId,
      isActive: true,
      availableKeys: { $gt: 0 },
    }).lean()
    return res.status(200).json({ status: "200", message: "ok", data: { products } })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/v1/store/products/:id ─────────────────────────────────────────
export const getStoreProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isActive: true }).lean()
    if (!product) {
      return res.status(404).json({ status: "404", message: "Product not found", data: null })
    }
    return res.status(200).json({ status: "200", message: "ok", data: product })
  } catch (err) {
    next(err)
  }
}
