import { Order, IOrder } from "./Order.model.js"
import { GameKey } from "../products/GameKey.model.js"
import { Product } from "../products/Product.model.js"
import { sendKeyDeliveryEmail } from "../../shared/utils/mailer.js"

export interface FulfillResult {
  ok: boolean
  reason?: "already_delivered" | "out_of_stock" | "key_missing_code"
  order?: IOrder
}

// Marks an order as `delivered`, atomically assigns/promotes a GameKey,
// sends the delivery email, and persists audit timestamps.
//
// Used by:
//   - Stripe webhook on payment_intent.succeeded
//   - Admin CRM when an admin manually flips an order to "delivered"
//
// SAFE TO CALL TWICE: a delivered order with a key short-circuits with
// `already_delivered` and does not re-send the email.
export async function fulfillOrder(orderId: string): Promise<FulfillResult> {
  const order = await Order.findById(orderId)
  if (!order) return { ok: false }

  // Already fully fulfilled — idempotent no-op (do NOT resend email here)
  if (order.status === "delivered" && order.keyAssignedAt) {
    return { ok: true, reason: "already_delivered", order }
  }

  const item = order.items[0]
  if (!item) return { ok: false }

  // Assign a key if the order doesn't have one yet. Prefer the key already
  // reserved for this order; fall back to any available key for the product.
  let keyId = item.keyId
  let assignedCode: string | null = null

  if (keyId) {
    // Promote the reserved key to "sold" atomically. Filter on the keyId AND
    // status so we don't double-sell if something raced.
    const promoted = await GameKey.findOneAndUpdate(
      { _id: keyId, status: { $in: ["reserved", "available"] } },
      { status: "sold", soldAt: new Date(), soldInOrderId: order._id },
      { new: true }
    ).select("+code")
    if (promoted?.code) {
      assignedCode = promoted.code
    } else {
      // Key was already sold by another path — read its code for delivery.
      const existing = await GameKey.findById(keyId).select("+code")
      if (!existing?.code) return { ok: false, reason: "key_missing_code" }
      assignedCode = existing.code
    }
  } else {
    // No key on the order yet (admin manually pushing to delivered for an
    // order that never reserved one). Pull one from inventory atomically.
    const claimed = await GameKey.findOneAndUpdate(
      { productId: item.productId, status: "available" },
      { status: "sold", soldAt: new Date(), soldInOrderId: order._id },
      { new: true }
    ).select("+code")
    if (!claimed?.code) return { ok: false, reason: "out_of_stock" }
    await Product.findByIdAndUpdate(item.productId, { $inc: { availableKeys: -1 } })
    keyId = claimed._id
    assignedCode = claimed.code
    item.keyId = claimed._id
  }

  order.status = "delivered"
  order.keyAssignedAt = order.keyAssignedAt ?? new Date()
  await order.save()

  // Send the key delivery email; record outcome on the order so the CRM can
  // surface failures and offer a retry. Failures here must NOT throw — the
  // order is already delivered; we just need a retry signal.
  try {
    await sendKeyDeliveryEmail(order.customerEmail, item.productName, assignedCode, order._id.toString())
    await Order.findByIdAndUpdate(order._id, { emailStatus: "sent", emailSentAt: new Date() })
  } catch (err) {
    console.error("[Fulfill] Delivery email failed", {
      orderId: order._id.toString(),
      recipient: order.customerEmail,
      error: (err as Error).message,
    })
    await Order.findByIdAndUpdate(order._id, { emailStatus: "failed" }).catch(() => {})
  }

  return { ok: true, order }
}
