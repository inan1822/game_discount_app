import { Request, Response, NextFunction } from "express"
import Stripe from "stripe"
import { Product } from "../products/Product.model.js"
import { GameKey } from "../products/GameKey.model.js"
import { Order } from "../orders/Order.model.js"
import { PromoCode } from "../promos/PromoCode.model.js"
import userModel from "../users/User.model.js"
import { sendKeyDeliveryEmail, sendPaidConfirmationEmail } from "../../shared/utils/mailer.js"

// Awaits an email send and records the outcome on the order so the CRM can
// retry failed sends. NEVER throws — email failure must not break checkout.
async function sendAndRecord(
  orderId: string,
  recipient: string,
  send: () => Promise<void>,
): Promise<void> {
  try {
    await send()
    await Order.findByIdAndUpdate(orderId, {
      emailStatus: "sent",
      emailSentAt: new Date(),
    })
  } catch (err) {
    console.error("[Checkout] Email failed", { orderId, recipient, error: (err as Error).message })
    await Order.findByIdAndUpdate(orderId, { emailStatus: "failed" }).catch(() => {})
  }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-05-27.dahlia",
})

// ── POST /api/v1/checkout ───────────────────────────────────────────────────
// Body: { productId: string }
// Requires auth (authMiddleware applied in routes).
// 1. Finds an available key for the product
// 2. Creates a Stripe PaymentIntent
// 3. Reserves the key
// 4. Creates a pending Order
// Returns: { clientSecret, orderId }
export const createCheckout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const decoded = req.user as { id: string; role: string }
    const dbUser  = await userModel.findById(decoded.id).select("email _id").lean()
    if (!dbUser) return res.status(401).json({ status: "401", message: "User not found", data: null })

    const { productId, promoCode: rawPromoCode } = req.body as {
      productId: string; promoCode?: string
    }

    if (!productId) {
      return res.status(400).json({ status: "400", message: "productId is required", data: null })
    }

    // Load the product
    const product = await Product.findOne({ _id: productId, isActive: true })
    if (!product) {
      return res.status(404).json({ status: "404", message: "Product not found", data: null })
    }

    // Check there is at least one available key
    const key = await GameKey.findOne({ productId: product._id, status: "available" })
    if (!key) {
      return res.status(409).json({ status: "409", message: "Out of stock — no keys available", data: null })
    }

    // ── Validate promo code (optional) ─────────────────────────────────────
    let discountAmount = 0
    let appliedPromoCode: string | null = null

    if (rawPromoCode) {
      const promo = await PromoCode.findOne({
        code: rawPromoCode.toUpperCase().trim(), isActive: true,
      })
      const promoValid =
        promo &&
        (!promo.expiresAt   || promo.expiresAt > new Date()) &&
        (promo.maxUses === null || promo.usedCount < promo.maxUses) &&
        product.price >= promo.minOrderAmount

      if (promoValid && promo) {
        discountAmount = promo.type === "percent"
          ? Math.min(product.price, Number(((product.price * promo.value) / 100).toFixed(2)))
          : Math.min(product.price, promo.value)
        appliedPromoCode = promo.code
      }
    }

    const finalPrice = Math.max(0, Number((product.price - discountAmount).toFixed(2)))

    // ── FREE product — skip Stripe, deliver immediately ────────────────────
    if (finalPrice === 0) {
      const claimedKey = await GameKey.findOneAndUpdate(
        { productId: product._id, status: "available" },
        { status: "sold", soldAt: new Date() },
        { new: true }
      )
      if (!claimedKey) {
        return res.status(409).json({ status: "409", message: "Out of stock — no keys available", data: null })
      }

      await Product.findByIdAndUpdate(product._id, { $inc: { availableKeys: -1 } })

      if (appliedPromoCode) {
        await PromoCode.findOneAndUpdate({ code: appliedPromoCode }, { $inc: { usedCount: 1 } })
      }

      const order = await Order.create({
        customerEmail:  dbUser.email,
        customerUserId: dbUser._id,
        items: [{
          productId:   product._id,
          productName: product.name,
          keyId:       claimedKey._id,
          quantity:    1,
          unitPrice:   0,
        }],
        totalAmount:    0,
        discountAmount,
        promoCode:      appliedPromoCode,
        status:         "delivered",
        paymentRef:     "free",
        keyAssignedAt:  new Date(),
      })

      await GameKey.findByIdAndUpdate(claimedKey._id, {
        soldInOrderId: order._id,
        reservedByOrderId: order._id,
      })

      // Awaited so checkout response reflects email status. Errors are caught
      // inside sendAndRecord and surfaced via order.emailStatus for CRM retry.
      await sendAndRecord(order._id.toString(), dbUser.email, () =>
        sendKeyDeliveryEmail(dbUser.email, product.name, claimedKey.code, order._id.toString())
      )

      return res.status(201).json({
        status: "201",
        message: "Free product claimed",
        data: {
          clientSecret:   null,
          isFree:         true,
          gameKey:        claimedKey.code,
          orderId:        order._id.toString(),
          originalPrice:  product.price,
          discountAmount,
          finalPrice:     0,
          promoCode:      appliedPromoCode,
        },
      })
    }

    // ── Paid product — create Stripe PaymentIntent ─────────────────────────
    const amountCents = Math.round(finalPrice * 100) // always > 0 here

    const intent = await stripe.paymentIntents.create({
      amount:   amountCents,
      currency: "usd",
      metadata: {
        productId:   product._id.toString(),
        productName: product.name,
        userId:      dbUser._id.toString(),
        userEmail:   dbUser.email,
        promoCode:   appliedPromoCode ?? "",
      },
    })

    // Reserve the key atomically (findOneAndUpdate prevents double-reservation)
    const reservedKey = await GameKey.findOneAndUpdate(
      { productId: product._id, status: "available" },
      { status: "reserved", reservedAt: new Date() },
      { new: true }
    )
    if (!reservedKey) {
      // Race condition — another request grabbed the last key
      await stripe.paymentIntents.cancel(intent.id)
      return res.status(409).json({ status: "409", message: "Out of stock — no keys available", data: null })
    }

    // Update denormalized availableKeys count
    await Product.findByIdAndUpdate(product._id, { $inc: { availableKeys: -1 } })

    // Increment promo usedCount atomically
    if (appliedPromoCode) {
      await PromoCode.findOneAndUpdate({ code: appliedPromoCode }, { $inc: { usedCount: 1 } })
    }

    // Create a pending Order
    const order = await Order.create({
      customerEmail:  dbUser.email,
      customerUserId: dbUser._id,
      items: [{
        productId:   product._id,
        productName: product.name,
        keyId:       reservedKey._id,
        quantity:    1,
        unitPrice:   product.price,
      }],
      totalAmount:    finalPrice,
      discountAmount,
      promoCode:      appliedPromoCode,
      status:         "pending",
      paymentRef:     intent.id,
    })

    // Stamp the reserved key with the order ID
    await GameKey.findByIdAndUpdate(reservedKey._id, { reservedByOrderId: order._id })

    // Awaited "payment received" email. The webhook will send the key in a
    // SEPARATE email after Stripe confirms — this one just acknowledges intent.
    // We do NOT touch emailStatus here because the webhook's key-delivery email
    // is the authoritative delivery signal.
    try {
      await sendPaidConfirmationEmail(dbUser.email, product.name, finalPrice, order._id.toString())
    } catch (err) {
      console.error("[Checkout] Paid confirmation email failed", {
        orderId: order._id.toString(),
        recipient: dbUser.email,
        error: (err as Error).message,
      })
    }

    return res.status(201).json({
      status: "201",
      message: "Checkout created",
      data: {
        clientSecret:   intent.client_secret,
        isFree:         false,
        orderId:        order._id.toString(),
        originalPrice:  product.price,
        discountAmount,
        finalPrice,
        promoCode:      appliedPromoCode,
      },
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/v1/checkout/orders/:orderId/key ─────────────────────────────────
// Returns the game key for a delivered order owned by the authenticated user.
export const getOrderKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const decoded = req.user as { id: string }
    const { orderId } = req.params

    const order = await Order.findOne({ _id: orderId, customerUserId: decoded.id })
    if (!order) {
      return res.status(404).json({ status: "404", message: "Order not found", data: null })
    }
    if (order.status !== "delivered") {
      return res.status(400).json({ status: "400", message: "Key not yet available — order not delivered", data: null })
    }

    const keyId = order.items[0]?.keyId
    if (!keyId) {
      return res.status(404).json({ status: "404", message: "No key found for this order", data: null })
    }

    const key = await GameKey.findById(keyId).select("+code")
    if (!key?.code) {
      return res.status(404).json({ status: "404", message: "Key not found", data: null })
    }

    return res.status(200).json({ status: "200", message: "ok", data: { code: key.code } })
  } catch (err) { next(err) }
}

// ── GET /api/v1/checkout/orders ─────────────────────────────────────────────
// Returns the authenticated customer's own orders.
export const getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const decoded = req.user as { id: string }
    const page  = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10)
    const skip  = (page - 1) * limit

    const [orders, total] = await Promise.all([
      Order.find({ customerUserId: decoded.id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments({ customerUserId: decoded.id }),
    ])

    return res.status(200).json({
      status: "200",
      message: "ok",
      data: { orders, total, page, pages: Math.ceil(total / limit) },
    })
  } catch (err) {
    next(err)
  }
}
