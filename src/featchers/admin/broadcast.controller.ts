import { Request, Response, NextFunction } from "express"
import userModel from "../users/User.model.js"
import NotificationModel from "../notifications/Notification.model.js"
import nodemailer from "nodemailer"
import { getIO } from "../../shared/socket/io.js"

// ── POST /api/v1/admin/broadcast ─────────────────────────────────────────────
// Body: { title, body, type, target, sendEmail }
// target: "all" | "verified" | "purchasers" (purchasers = users who ordered at least once)
export async function broadcastNotification(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      title,
      body,
      type       = "announcement",
      target     = "all",
      sendEmail  = false,
    } = req.body as {
      title: string
      body: string
      type?: "event" | "discount" | "announcement"
      target?: "all" | "verified"
      sendEmail?: boolean
    }

    if (!title?.trim() || !body?.trim()) {
      res.status(400).json({ message: "title and body are required" }); return
    }

    // ── Build user filter ────────────────────────────────────────────────────
    const filter: Record<string, unknown> = { isBanned: { $ne: true } }
    if (target === "verified") filter.isVerified = true

    const users = await userModel.find(filter).select("_id email").lean()
    if (users.length === 0) {
      res.json({ sent: 0, emailsSent: 0 }); return
    }

    // ── Create in-app notifications (batch insert) ───────────────────────────
    const BATCH = 500
    let totalInserted = 0
    for (let i = 0; i < users.length; i += BATCH) {
      const batch = users.slice(i, i + BATCH)
      const docs  = batch.map(u => ({
        userId:   u._id,
        type,
        title:    title.trim(),
        body:     body.trim(),
        gameId:   null,
        gameSlug: null,
        link:     null,
        read:     false,
      }))
      await NotificationModel.insertMany(docs, { ordered: false })
      totalInserted += docs.length
    }

    // ── Emit socket event so online users see it live ────────────────────────
    try {
      getIO().emit("notification:broadcast", { type, title: title.trim(), body: body.trim() })
    } catch { /* socket may not be ready in tests */ }

    // ── Optional bulk email ──────────────────────────────────────────────────
    let emailsSent = 0
    if (sendEmail && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      })

      // Send in batches of 50 BCC to avoid Gmail limits
      const BCC_BATCH = 50
      const emails    = users.map(u => u.email)
      for (let i = 0; i < emails.length; i += BCC_BATCH) {
        const bcc = emails.slice(i, i + BCC_BATCH)
        await transporter.sendMail({
          from:    `"DisLow" <${process.env.EMAIL_USER}>`,
          to:      process.env.EMAIL_USER,  // send to self
          bcc:     bcc.join(", "),
          subject: title.trim(),
          html: `
            <div style="background:#12131a;color:#fff;font-family:Nunito,sans-serif;padding:32px;border-radius:12px;max-width:520px;margin:0 auto">
              <h2 style="color:#6475D1;margin-bottom:8px">${title.trim()}</h2>
              <p style="color:#b3bade;line-height:1.6">${body.trim()}</p>
              <hr style="border-color:rgba(188,188,201,0.15);margin:24px 0"/>
              <p style="color:#9fa0a1;font-size:12px">DisLow — Game Deal Finder</p>
            </div>
          `,
        })
        emailsSent += bcc.length
      }
    }

    res.json({ sent: totalInserted, emailsSent })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/v1/admin/broadcast/history ──────────────────────────────────────
// Returns recent broadcast announcements (type=announcement, userId sample)
export async function broadcastHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const page  = Math.max(1, parseInt(String(req.query.page || "1")))
    const limit = 20

    // Sample one announcement per (title, createdAt-day) by getting the latest
    // announcement notifications (one doc per user × N recipients = many docs).
    // We deduplicate by grouping on title + date.
    const agg = await NotificationModel.aggregate([
      { $match: { type: "announcement" } },
      {
        $group: {
          _id:       { title: "$title", body: "$body" },
          createdAt: { $max: "$createdAt" },
          recipients: { $sum: 1 },
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ])

    const history = agg.map(r => ({
      title:      r._id.title as string,
      body:       r._id.body  as string,
      recipients: r.recipients as number,
      sentAt:     (r.createdAt as Date).toISOString(),
    }))

    res.json({ history })
  } catch (err) { next(err) }
}
