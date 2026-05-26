import { Request, Response, NextFunction } from "express"
import { Ticket } from "./Ticket.model.js"
import { Order } from "../orders/Order.model.js"
import { getIO } from "../../shared/socket/io.js"
import mongoose from "mongoose"

// ── POST /api/v1/support/tickets ──────────────────────────────────────────────
// Authenticated user opens a new support ticket for one of their orders.
export const createTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const decoded = req.user as { id: string; email?: string }
    const { orderId, subject, description } = req.body as {
      orderId: string; subject: string; description: string
    }

    if (!orderId || !subject || !description) {
      return res.status(400).json({ status: "400", message: "orderId, subject and description are required", data: null })
    }

    const order = await Order.findOne({ _id: orderId, customerUserId: decoded.id })
    if (!order) {
      return res.status(404).json({ status: "404", message: "Order not found", data: null })
    }

    const userEmail = order.customerEmail

    const ticket = await Ticket.create({
      userId:      decoded.id,
      userEmail,
      orderId:     order._id,
      orderRef:    order._id.toString().slice(-8).toUpperCase(),
      productName: order.items[0]?.productName ?? "Order",
      subject,
      description,
      messages: [{
        senderRole: "user",
        senderId:   new mongoose.Types.ObjectId(decoded.id),
        body:       description,
      }],
    })

    // Notify admins via socket (non-blocking)
    try {
      getIO().to("admins").emit("ticket:new", {
        ticketId: ticket._id,
        userEmail,
        subject,
        orderRef: ticket.orderRef,
      })
    } catch { /* socket not critical */ }

    return res.status(201).json({ status: "201", message: "Ticket created", data: ticket })
  } catch (err) { next(err) }
}

// ── GET /api/v1/support/tickets ───────────────────────────────────────────────
export const listMyTickets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const decoded = req.user as { id: string }
    const page  = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = 20
    const skip  = (page - 1) * limit

    const [tickets, total] = await Promise.all([
      Ticket.find({ userId: decoded.id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Ticket.countDocuments({ userId: decoded.id }),
    ])

    return res.status(200).json({
      status: "200", message: "ok",
      data: { tickets, total, page, pages: Math.ceil(total / limit) },
    })
  } catch (err) { next(err) }
}

// ── GET /api/v1/support/tickets/:id ──────────────────────────────────────────
export const getMyTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const decoded = req.user as { id: string }
    const ticket  = await Ticket.findOne({ _id: req.params.id, userId: decoded.id }).lean()
    if (!ticket) {
      return res.status(404).json({ status: "404", message: "Ticket not found", data: null })
    }
    return res.status(200).json({ status: "200", message: "ok", data: ticket })
  } catch (err) { next(err) }
}

// ── POST /api/v1/support/tickets/:id/messages ─────────────────────────────────
export const addUserMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const decoded = req.user as { id: string }
    const { body } = req.body as { body: string }

    if (!body?.trim()) {
      return res.status(400).json({ status: "400", message: "body is required", data: null })
    }

    const ticket = await Ticket.findOne({ _id: req.params.id, userId: decoded.id })
    if (!ticket) {
      return res.status(404).json({ status: "404", message: "Ticket not found", data: null })
    }
    if (ticket.status === "closed") {
      return res.status(400).json({ status: "400", message: "Ticket is closed", data: null })
    }

    ticket.messages.push({
      senderRole: "user",
      senderId:   new mongoose.Types.ObjectId(decoded.id),
      body:       body.trim(),
    } as any)

    // Reopen resolved tickets when user replies
    if (ticket.status === "resolved") ticket.status = "in_progress"
    await ticket.save()

    try {
      getIO().to("admins").emit("ticket:message", {
        ticketId:  ticket._id,
        userEmail: ticket.userEmail,
        body:      body.trim(),
      })
    } catch { /* socket not critical */ }

    return res.status(200).json({ status: "200", message: "Message sent", data: ticket })
  } catch (err) { next(err) }
}

// ── Admin: GET /api/v1/admin/tickets ─────────────────────────────────────────
export const adminListTickets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = 20
    const skip  = (page - 1) * limit

    const filter: Record<string, unknown> = {}
    if (req.query.status) filter.status = req.query.status
    if (req.query.search) filter.userEmail = { $regex: req.query.search, $options: "i" }

    const [tickets, total] = await Promise.all([
      Ticket.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Ticket.countDocuments(filter),
    ])

    return res.status(200).json({
      status: "200", message: "ok",
      data: { tickets, total, page, pages: Math.ceil(total / limit) },
    })
  } catch (err) { next(err) }
}

// ── Admin: GET /api/v1/admin/tickets/:id ──────────────────────────────────────
export const adminGetTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await Ticket.findById(req.params.id).lean()
    if (!ticket) {
      return res.status(404).json({ status: "404", message: "Ticket not found", data: null })
    }
    return res.status(200).json({ status: "200", message: "ok", data: ticket })
  } catch (err) { next(err) }
}

// ── Admin: PATCH /api/v1/admin/tickets/:id ───────────────────────────────────
export const adminUpdateTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body as { status: string }
    const valid = ["open", "in_progress", "resolved", "closed"]
    if (!valid.includes(status)) {
      return res.status(400).json({ status: "400", message: "Invalid status", data: null })
    }
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, { status }, { new: true })
    if (!ticket) {
      return res.status(404).json({ status: "404", message: "Ticket not found", data: null })
    }
    return res.status(200).json({ status: "200", message: "ok", data: ticket })
  } catch (err) { next(err) }
}

// ── Admin: POST /api/v1/admin/tickets/:id/messages ────────────────────────────
export const adminAddMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const decoded = req.user as { id: string }
    const { body } = req.body as { body: string }

    if (!body?.trim()) {
      return res.status(400).json({ status: "400", message: "body is required", data: null })
    }

    const ticket = await Ticket.findById(req.params.id)
    if (!ticket) {
      return res.status(404).json({ status: "404", message: "Ticket not found", data: null })
    }

    ticket.messages.push({
      senderRole: "admin",
      senderId:   new mongoose.Types.ObjectId(decoded.id),
      body:       body.trim(),
    } as any)

    if (ticket.status === "open") ticket.status = "in_progress"
    await ticket.save()

    // Notify user via per-user socket room (degrades gracefully if room is empty)
    try {
      getIO().to(`user:${ticket.userId}`).emit("ticket:reply", {
        ticketId: ticket._id,
        body:     body.trim(),
      })
    } catch { /* socket not critical */ }

    return res.status(200).json({ status: "200", message: "ok", data: ticket })
  } catch (err) { next(err) }
}
