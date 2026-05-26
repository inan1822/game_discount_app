import { Request, Response } from "express"
import Stripe from "stripe"
import { Order } from "../orders/Order.model.js"
import { GameKey } from "../products/GameKey.model.js"
import { Product } from "../products/Product.model.js"
import { WebhookEvent } from "./WebhookEvent.model.js"
import { fulfillOrder } from "../orders/fulfillment.js"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-04-22.dahlia",
})

// ── POST /api/v1/webhooks/stripe ────────────────────────────────────────────
// Express.raw() is applied in server.ts BEFORE express.json() for this route.
export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    )
  } catch (err) {
    console.error("[Webhook] Signature verification failed:", err)
    return res.status(400).send("Webhook signature verification failed")
  }

  // ── Idempotency: drop duplicate deliveries from Stripe ─────────────────────
  // Stripe retries on any 5xx and occasionally re-delivers under normal
  // network conditions. Unique index on stripeEventId → second insert throws.
  try {
    await WebhookEvent.create({ stripeEventId: event.id })
  } catch (err) {
    const dupKey = (err as { code?: number }).code === 11000
    if (dupKey) {
      console.log(`[Webhook] Duplicate event ${event.id} ignored`)
      return res.status(200).json({ received: true, duplicate: true })
    }
    // Storage error — fall through and process; better to double-process
    // than to drop a payment confirmation entirely.
    console.error("[Webhook] Failed to record event id:", err)
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent
    const order = await Order.findOne({ paymentRef: intent.id }).select("_id").lean()
    if (order) {
      await fulfillOrder(order._id.toString())
    } else {
      console.warn(`[Webhook] No order found for paymentRef=${intent.id}`)
    }
  }

  if (event.type === "payment_intent.payment_failed" || event.type === "payment_intent.canceled") {
    const intent = event.data.object as Stripe.PaymentIntent
    await releaseReservation(intent)
  }

  return res.status(200).json({ received: true })
}

async function releaseReservation(intent: Stripe.PaymentIntent) {
  try {
    const order = await Order.findOne({ paymentRef: intent.id })
    if (!order || order.status !== "pending") return

    order.status = "cancelled"
    await order.save()

    // Release reserved key back to available
    const keyId = order.items[0]?.keyId
    if (keyId) {
      await GameKey.findByIdAndUpdate(keyId, {
        status: "available",
        reservedAt: null,
        reservedByOrderId: null,
      })
      // Restore denormalized count
      await Product.findByIdAndUpdate(order.items[0].productId, { $inc: { availableKeys: 1 } })
    }

    console.log(`[Webhook] Reservation released for order ${order._id}`)
  } catch (err) {
    console.error("[Webhook] releaseReservation error:", err)
  }
}
