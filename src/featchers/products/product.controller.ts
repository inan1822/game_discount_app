import { Request, Response, NextFunction } from "express"
import { Product, ProductCategory, ProductPlatform } from "./Product.model.js"
import { GameKey } from "./GameKey.model.js"

const CATEGORIES: ProductCategory[] = ["gamekey", "giftcard", "subscription", "dlc", "currency"]
const PLATFORMS:  ProductPlatform[]  = ["PC", "PS5", "Xbox", "Switch", "Other"]

// ── GET /api/v1/admin/products ──────────────────────────────────────────────
export const listProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1)
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20)
    const skip  = (page - 1) * limit

    const filter: Record<string, unknown> = {}

    if (req.query.search) {
      filter.name = new RegExp(req.query.search as string, "i")
    }
    if (req.query.category && CATEGORIES.includes(req.query.category as ProductCategory)) {
      filter.category = req.query.category
    }
    if (req.query.platform && PLATFORMS.includes(req.query.platform as ProductPlatform)) {
      filter.platform = req.query.platform
    }
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === "true"
    }

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

// ── POST /api/v1/admin/products ─────────────────────────────────────────────
export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, imageUrl, rawgGameId, rawgGameName, platform, category, price, isActive, isFeatured } = req.body

    if (!name || !platform || !category || price == null) {
      return res.status(400).json({ status: "400", message: "name, platform, category and price are required", data: null })
    }

    const product = await Product.create({
      name, description, imageUrl,
      rawgGameId:   rawgGameId   ?? null,
      rawgGameName: rawgGameName ?? null,
      platform, category,
      price:      Number(price),
      isActive:   isActive !== false,
      isFeatured: isFeatured === true,
    })

    return res.status(201).json({ status: "201", message: "Product created", data: product })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/v1/admin/products/:id ─────────────────────────────────────────
export const getProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await Product.findById(req.params.id).lean()
    if (!product) {
      return res.status(404).json({ status: "404", message: "Product not found", data: null })
    }
    // Add live key status counts
    const [available, reserved, sold] = await Promise.all([
      GameKey.countDocuments({ productId: product._id, status: "available" }),
      GameKey.countDocuments({ productId: product._id, status: "reserved" }),
      GameKey.countDocuments({ productId: product._id, status: "sold" }),
    ])
    return res.status(200).json({
      status: "200",
      message: "ok",
      data: { ...product, keyStats: { available, reserved, sold } },
    })
  } catch (err) {
    next(err)
  }
}

// ── PUT /api/v1/admin/products/:id ─────────────────────────────────────────
export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, imageUrl, rawgGameId, rawgGameName, platform, category, price, isActive, isFeatured } = req.body

    const update: Record<string, unknown> = {
      name, description, imageUrl, rawgGameId, rawgGameName, platform, category, isActive,
    }
    if (price !== undefined)      update.price      = Number(price)
    if (isFeatured !== undefined) update.isFeatured = !!isFeatured

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    ).lean()

    if (!product) {
      return res.status(404).json({ status: "404", message: "Product not found", data: null })
    }

    return res.status(200).json({ status: "200", message: "Product updated", data: product })
  } catch (err) {
    next(err)
  }
}

// ── DELETE /api/v1/admin/products/:id ──────────────────────────────────────
// Soft-delete if any key has been sold; hard-delete otherwise.
export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ status: "404", message: "Product not found", data: null })
    }

    const soldCount = await GameKey.countDocuments({ productId: product._id, status: "sold" })

    if (soldCount > 0) {
      // Soft-delete: deactivate but keep for order history
      product.isActive = false
      await product.save()
      return res.status(200).json({ status: "200", message: "Product deactivated (has sold keys — not hard-deleted)", data: product })
    }

    // Hard-delete: remove product + all its unsold keys
    await GameKey.deleteMany({ productId: product._id })
    await product.deleteOne()

    return res.status(200).json({ status: "200", message: "Product deleted", data: null })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/v1/admin/products/:id/keys ────────────────────────────────────
// Default: codes are hidden (select: false in schema).
// Add ?reveal=1 to include actual codes (admin export).
export const listKeys = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1)
    const limit = Math.min(200, parseInt(req.query.limit as string) || 50)
    const skip  = (page - 1) * limit
    const reveal = req.query.reveal === "1"

    const filter: Record<string, unknown> = { productId: req.params.id }
    if (req.query.status) filter.status = req.query.status

    const query = GameKey.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    if (reveal) query.select("+code")

    const [keys, total] = await Promise.all([
      query.lean(),
      GameKey.countDocuments(filter),
    ])

    return res.status(200).json({
      status: "200",
      message: "ok",
      data: { keys, total, page, pages: Math.ceil(total / limit) },
    })
  } catch (err) {
    next(err)
  }
}

// ── POST /api/v1/admin/products/:id/keys ───────────────────────────────────
// Body: { codes: string[] }
// Deduplicates against existing codes (unique index). Updates Product stock counts.
export const importKeys = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { codes } = req.body as { codes: string[] }

    if (!Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({ status: "400", message: "codes array is required", data: null })
    }

    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ status: "404", message: "Product not found", data: null })
    }

    // Deduplicate within the submitted batch
    const unique = [...new Set(codes.map(c => c.trim()).filter(Boolean))]

    // Find which codes already exist in the DB
    const existing = await GameKey.find({ code: { $in: unique } }).select("+code").lean()
    const existingSet = new Set(existing.map(k => k.code))

    const toInsert = unique.filter(c => !existingSet.has(c))
    const duplicates = unique.length - toInsert.length

    if (toInsert.length > 0) {
      await GameKey.insertMany(
        toInsert.map(code => ({ productId: product._id, code, status: "available" })),
        { ordered: false }
      )

      // Update denormalized counts on Product
      const available = await GameKey.countDocuments({ productId: product._id, status: "available" })
      const total     = await GameKey.countDocuments({ productId: product._id })
      await Product.findByIdAndUpdate(product._id, { availableKeys: available, totalKeys: total })
    }

    return res.status(201).json({
      status: "201",
      message: "Keys imported",
      data: { inserted: toInsert.length, duplicates },
    })
  } catch (err) {
    next(err)
  }
}
