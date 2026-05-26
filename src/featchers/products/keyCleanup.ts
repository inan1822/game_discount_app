import { GameKey } from "./GameKey.model.js"
import { Product } from "./Product.model.js"
import { Order } from "../orders/Order.model.js"

const SCAN_INTERVAL_MS = 5 * 60 * 1000  // 5 min
const STALE_AFTER_MS   = 30 * 60 * 1000 // 30 min — reserved longer than this is a leak

// Releases keys that were reserved by a crashed/cancelled checkout so they
// return to inventory. A "leaked" key is one whose `reservedAt` is old AND
// whose parent order is cancelled OR has been pending for too long
// (Stripe gives up on a payment intent after ~24h).
//
// We do NOT delete the key — destructive TTL would lose paid inventory if a
// webhook arrives late. Instead we flip status back to "available".
export async function releaseStaleReservations(): Promise<{ released: number }> {
  const staleBefore = new Date(Date.now() - STALE_AFTER_MS)

  // 1. Find orders that should not be holding key reservations anymore
  const releasableOrders = await Order.find({
    $or: [
      { status: "cancelled" },
      { status: "pending", createdAt: { $lt: staleBefore } },
    ],
    "items.0.keyId": { $ne: null },
  }).select("_id items.productId items.keyId").lean()

  if (!releasableOrders.length) return { released: 0 }

  let released = 0
  for (const order of releasableOrders) {
    const item = order.items[0]
    if (!item?.keyId) continue

    // Only release keys still in `reserved` state (don't touch sold/available)
    const updated = await GameKey.findOneAndUpdate(
      { _id: item.keyId, status: "reserved", reservedAt: { $lt: staleBefore } },
      { status: "available", reservedAt: null, reservedByOrderId: null }
    )

    if (updated) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { availableKeys: 1 } })
      released++
    }
  }

  if (released > 0) console.log(`[KeyCleanup] Released ${released} stale reserved key(s)`)
  return { released }
}

export function startKeyCleanupJob(): NodeJS.Timeout {
  // Fire-and-forget — never throws out of setInterval. Catches its own errors.
  const tick = () => releaseStaleReservations().catch(err =>
    console.error("[KeyCleanup] tick error:", err)
  )
  // Don't run immediately on boot — give the DB connection a beat.
  const handle = setInterval(tick, SCAN_INTERVAL_MS)
  return handle
}
