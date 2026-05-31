import { Request, Response, NextFunction } from "express"
import {
  createOrGetConversation,
  listConversations,
  getMessages,
  sendMessage,
  markRead,
} from "./chat.service.js"

// ── GET /api/v1/chat/conversations ───────────────────────────────────────────
export const getConversations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.user as { id: string }
    const conversations = await listConversations(id)
    return res.status(200).json({ status: "200", message: "ok", data: conversations })
  } catch (err) { next(err) }
}

// ── POST /api/v1/chat/conversations/:withUserId ──────────────────────────────
// Lazily get-or-create the 1:1 conversation and return it + quota meta.
export const openConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.user as { id: string }
    const result = await createOrGetConversation(id, String(req.params.withUserId))
    return res.status(200).json({ status: "200", message: "ok", data: result })
  } catch (err) { next(err) }
}

// ── GET /api/v1/chat/conversations/:id/messages?before= ──────────────────────
export const getConversationMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.user as { id: string }
    const before = typeof req.query.before === "string" ? req.query.before : undefined
    const result = await getMessages(id, String(req.params.id), before)
    return res.status(200).json({ status: "200", message: "ok", data: result })
  } catch (err) { next(err) }
}

// ── POST /api/v1/chat/conversations/:withUserId/messages ─────────────────────
export const postMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.user as { id: string }
    const { body, clientTempId } = req.body as { body: string; clientTempId?: string }
    const result = await sendMessage(id, String(req.params.withUserId), body, clientTempId)
    return res.status(201).json({ status: "201", message: "Message sent", data: result })
  } catch (err) {
    // Rate-limit hit → respond with a clean remaining:0 payload for the UI.
    if ((err as { status?: number })?.status === 429) {
      return res.status(429).json({
        status:  "429",
        message: (err as Error).message,
        data:    { remaining: 0 },
      })
    }
    next(err)
  }
}

// ── POST /api/v1/chat/conversations/:id/read ─────────────────────────────────
export const postRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.user as { id: string }
    await markRead(id, String(req.params.id))
    return res.status(200).json({ status: "200", message: "ok", data: null })
  } catch (err) { next(err) }
}
