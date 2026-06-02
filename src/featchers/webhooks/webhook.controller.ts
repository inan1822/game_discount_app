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

  // ── Idempotency guard ──────────────────────────────────────────────────────
  // We record the event id ONLY AFTER it is processed successfully (below).
  // Recording it up-front (the previous approach) meant a transient DB error
  // during fulfillment would throw → 500 → Stripe retries → the retry hits the
  // already-recorded id and 200-skips, permanently stranding a *paid* order.
  const alreadyProcessed = await WebhookEvent.exists({ stripeEventId: event.id })
  if (alreadyProcessed) {
    console.log(`[Webhook] Duplicate event ${event.id} ignored`)
    return res.status(200).json({ received: true, duplicate: true })
  }

  // ── Process ────────────────────────────────────────────────────────────────
  // On a thrown (transient) error we return 500 so Stripe retries, and we do NOT
  // record the id — so the retry actually re-processes. fulfillOrder and
  // releaseReservation are both idempotent, so a concurrent duplicate that slips
  // past the guard above is harmless.
  try {
    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent
      const order = await Order.findOne({ paymentRef: intent.id }).select("_id").lean()
      if (order) {
        const result = await fulfillOrder(order._id.toString())
        if (!result.ok) {
          // Business failure (e.g. out_of_stock) — a retry won't conjure a key.
          // This is an oversell needing admin attention; log loudly, don't 500.
          console.error(`[Webhook] Fulfillment incomplete for order ${order._id} (reason: ${result.reason ?? "unknown"})`)
        }
      } else {
        console.warn(`[Webhook] No order found for paymentRef=${intent.id}`)
      }
    } else if (event.type === "payment_intent.payment_failed" || event.type === "payment_intent.canceled") {
      await releaseReservation(event.data.object as Stripe.PaymentIntent)
    }
  } catch (err) {
    console.error(`[Webhook] Processing failed for event ${event.id}:`, err)
    return res.status(500).json({ received: false, error: "processing failed" })
  }

  // ── Record (only after success) ────────────────────────────────────────────
  try {
    await WebhookEvent.create({ stripeEventId: event.id })
  } catch (err) {
    // 11000 = a concurrent delivery already recorded it — expected, non-fatal.
    if ((err as { code?: number }).code !== 11000) {
      console.error("[Webhook] Failed to record processed event id (non-fatal):", err)
    }
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
