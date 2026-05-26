import { Request, Response, NextFunction } from "express"
import { Order, OrderStatus } from "./Order.model.js"
import { GameKey } from "../products/GameKey.model.js"
import { fulfillOrder } from "./fulfillment.js"
import { sendKeyDeliveryEmail } from "../../shared/utils/mailer.js"
import { getIO } from "../../shared/socket/io.js"

const VALID_STATUSES: OrderStatus[] = ["pending", "paid", "delivered", "cancelled", "refunded"]

// Allowed admin-driven transitions. Blocks nonsensical moves like
// "refunded → delivered" or "cancelled → pending" that would lie about
// real fulfillment state. Forward moves (pending → delivered, etc.) and
// terminal flips (delivered → refunded) are allowed.
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:   ["paid", "delivered", "cancelled"],
  paid:      ["delivered", "cancelled", "refunded"],
  delivered: ["refunded"],
  cancelled: [],
  refunded:  [],
}

// ── GET /api/v1/admin/orders ────────────────────────────────────────────────
// Query params: page, limit, status, search (email/paymentRef), from, to
export const listOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1)
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20)
    const skip  = (page - 1) * limit

    const filter: Record<string, unknown> = {}

    if (req.query.status && VALID_STATUSES.includes(req.query.status as OrderStatus)) {
      filter.status = req.query.status
    }

    if (req.query.search) {
      const re = new RegExp(req.query.search as string, "i")
      filter.$or = [{ customerEmail: re }, { paymentRef: re }]
    }

    if (req.query.from || req.query.to) {
      filter.createdAt = {}
      if (req.query.from) (filter.createdAt as Record<string, Date>).$gte = new Date(req.query.from as string)
      if (req.query.to)   (filter.createdAt as Record<string, Date>).$lte = new Date(req.query.to   as string)
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ])

    return res.status(200).json({
      status: "200",
      message: "ok",
      data: {
        orders,
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/v1/admin/orders/export ────────────────────────────────────────
// Streams a CSV with all (or filtered) orders — no pagination.
export const exportOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filter: Record<string, unknown> = {}

    if (req.query.status && VALID_STATUSES.includes(req.query.status as OrderStatus)) {
      filter.status = req.query.status
    }
    if (req.query.from || req.query.to) {
      filter.createdAt = {}
      if (req.query.from) (filter.createdAt as Record<string, Date>).$gte = new Date(req.query.from as string)
      if (req.query.to)   (filter.createdAt as Record<string, Date>).$lte = new Date(req.query.to   as string)
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 }).lean()

    const date = new Date().toISOString().slice(0, 10)
    res.setHeader("Content-Type", "text/csv")
    res.setHeader("Content-Disposition", `attachment; filename=orders-${date}.csv`)

    // Header row
    res.write("ID,Customer Email,Products,Total (USD),Status,Date\n")

    for (const o of orders) {
      const products = o.items.map(i => `${i.productName}×${i.quantity}`).join(" | ")
      const row = [
        o._id.toString(),
        o.customerEmail,
        `"${products}"`,
        o.totalAmount.toFixed(2),
        o.status,
        new Date(o.createdAt).toISOString(),
      ].join(",")
      res.write(row + "\n")
    }

    res.end()
  } catch (err) {
    next(err)
  }
}

// ── GET /api/v1/admin/orders/:id ───────────────────────────────────────────
export const getOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await Order.findById(req.params.id).lean()
    if (!order) {
      return res.status(404).json({ status: "404", message: "Order not found", data: null })
    }
    return res.status(200).json({ status: "200", message: "ok", data: order })
  } catch (err) {
    next(err)
  }
}

// ── PATCH /api/v1/admin/orders/:id ─────────────────────────────────────────
// Admin-driven status change. Validates transitions, and when the target is
// "delivered", actually fulfills the order (assigns key + sends email) so
// admin clicks reflect real-world state.
export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status: nextStatus } = req.body as { status: OrderStatus }

    if (!VALID_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ status: "400", message: "Invalid status value", data: null })
    }

    const current = await Order.findById(req.params.id)
    if (!current) {
      return res.status(404).json({ status: "404", message: "Order not found", data: null })
    }

    if (current.status === nextStatus) {
      return res.status(200).json({ status: "200", message: "No change", data: current.toObject() })
    }

    const allowed = ALLOWED_TRANSITIONS[current.status] ?? []
    if (!allowed.includes(nextStatus)) {
      return res.status(400).json({
        status: "400",
        message: `Cannot transition from "${current.status}" to "${nextStatus}"`,
        data: null,
      })
    }

    // Auto-fulfill on admin "delivered": assigns key (if missing), sends
    // delivery email, persists keyAssignedAt + emailStatus. Idempotent.
    if (nextStatus === "delivered") {
      const result = await fulfillOrder(current._id.toString())
      if (!result.ok) {
        const msg =
          result.reason === "out_of_stock" ? "Cannot deliver — no available keys for this product" :
          result.reason === "key_missing_code" ? "Assigned key has no code on file" :
          "Fulfillment failed"
        return res.status(409).json({ status: "409", message: msg, data: null })
      }
    } else if (nextStatus === "cancelled" || nextStatus === "refunded") {
      // Release any reserved key so inventory isn't stranded
      const keyId = current.items[0]?.keyId
      if (keyId) {
        await GameKey.findOneAndUpdate(
          { _id: keyId, status: "reserved" },
          { status: "available", reservedAt: null, reservedByOrderId: null }
        )
      }
      current.status = nextStatus
      await current.save()
    } else {
      current.status = nextStatus
      await current.save()
    }

    const fresh = await Order.findById(current._id).lean()

    try {
      getIO().to("admins").emit("order:updated", { id: current._id, status: fresh?.status })
    } catch {
      // Socket not initialised in test environments — non-fatal
    }

    return res.status(200).json({ status: "200", message: "Order updated", data: fresh })
  } catch (err) {
    next(err)
  }
}

// ── POST /api/v1/admin/orders/:id/resend-email ─────────────────────────────
// Re-sends the key delivery email for a delivered order. Use when emailStatus
// is "failed" or when a customer reports a missing email.
export const resendDeliveryEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) {
      return res.status(404).json({ status: "404", message: "Order not found", data: null })
    }
    if (order.status !== "delivered") {
      return res.status(400).json({ status: "400", message: "Order is not delivered — cannot resend key email", data: null })
    }
    const item = order.items[0]
    const key = item?.keyId ? await GameKey.findById(item.keyId).select("+code") : null
    if (!key?.code) {
      return res.status(404).json({ status: "404", message: "No key found for this order", data: null })
    }

    try {
      await sendKeyDeliveryEmail(order.customerEmail, item.productName, key.code, order._id.toString())
      order.emailStatus = "sent"
      order.emailSentAt = new Date()
      await order.save()
    } catch (err) {
      console.error("[Admin] Resend delivery email failed", {
        orderId: order._id.toString(),
        recipient: order.customerEmail,
        error: (err as Error).message,
      })
      order.emailStatus = "failed"
      await order.save()
      return res.status(502).json({ status: "502", message: "Email send failed — see server logs", data: null })
    }

    return res.status(200).json({ status: "200", message: "Email resent", data: { emailStatus: order.emailStatus, emailSentAt: order.emailSentAt } })
  } catch (err) {
    next(err)
  }
}
