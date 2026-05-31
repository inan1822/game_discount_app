import mongoose from "mongoose"
import userModel from "../users/User.model.js"
import { computeRelationship } from "../users/friends.service.js"
import { emitToUser } from "../../shared/socket/io.js"
import { AppError } from "../../shared/utils/AppError.js"
import { Conversation } from "./Conversation.model.js"
import { Message } from "./Message.model.js"

// ── Constants ───────────────────────────────────────────────────────────────
const NON_MUTUAL_LIMIT = 3
const RATE_WINDOW_MS    = 24 * 60 * 60 * 1000   // rolling 24h
const PAGE_SIZE         = 30
const ONLINE_WINDOW_MS  = 2 * 60 * 1000         // matches friends.service

// ── Shaped output types (what the client receives) ──────────────────────────
export interface ChatParticipant {
  _id:      string
  name:     string
  avatar:   string | null
  isOnline: boolean
}
export interface ChatConversationDTO {
  _id:         string
  other:       ChatParticipant
  lastMessage: { body: string; senderId: string; createdAt: Date } | null
  unread:      number
  updatedAt:   Date
}
export interface ChatQuota {
  relationship: string
  isMutual:     boolean
  remaining:    number | null   // null = unlimited (mutual friends)
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Order-independent key so the same pair always maps to one conversation. */
function canonicalPairKey(a: string, b: string): string {
  return [a, b].sort().join("_")
}

function isOnline(lastSeenAt: Date | undefined | null): boolean {
  if (!lastSeenAt) return false
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS
}

/** Count messages sent from `meId` → `otherId` within the rolling window. */
async function recentSentCount(meId: string, otherId: string): Promise<number> {
  return Message.countDocuments({
    senderId:    meId,
    recipientId: otherId,
    createdAt:   { $gt: new Date(Date.now() - RATE_WINDOW_MS) },
  })
}

/** Relationship + remaining quota of `meId` toward `otherId`. */
export async function getQuota(meId: string, otherId: string): Promise<ChatQuota> {
  const me = await userModel.findById(meId)
  if (!me) throw new AppError("User not found", 404)

  const relationship = computeRelationship(me, otherId)
  const isMutual     = relationship === "friends"
  if (isMutual) return { relationship, isMutual, remaining: null }

  const used = await recentSentCount(meId, otherId)
  return { relationship, isMutual, remaining: Math.max(0, NON_MUTUAL_LIMIT - used) }
}

/** Read a per-user counter from a Mongoose Map (lean docs may return Map or object). */
function readMapCount(map: Map<string, number> | Record<string, number> | undefined, key: string): number {
  if (!map) return 0
  if (map instanceof Map) return map.get(key) ?? 0
  return map[key] ?? 0
}

/** Shape a lean conversation doc for the requesting user. */
function shapeConversation(
  conv: {
    _id: mongoose.Types.ObjectId
    participants: Array<{ _id: mongoose.Types.ObjectId; name: string; avatar?: string | null; lastSeenAt?: Date }>
    lastMessage: { body: string; senderId: mongoose.Types.ObjectId; createdAt: Date } | null
    unread?: Map<string, number> | Record<string, number>
    updatedAt: Date
  },
  meId: string,
): ChatConversationDTO {
  const other = conv.participants.find(p => p._id.toString() !== meId) ?? conv.participants[0]
  return {
    _id:   conv._id.toString(),
    other: {
      _id:      other._id.toString(),
      name:     other.name,
      avatar:   other.avatar ?? null,
      isOnline: isOnline(other.lastSeenAt),
    },
    lastMessage: conv.lastMessage
      ? { body: conv.lastMessage.body, senderId: conv.lastMessage.senderId.toString(), createdAt: conv.lastMessage.createdAt }
      : null,
    unread:    readMapCount(conv.unread, meId),
    updatedAt: conv.updatedAt,
  }
}

// ── Service API ─────────────────────────────────────────────────────────────

/** Lazily get-or-create the 1:1 conversation between `meId` and `withUserId`. */
export async function createOrGetConversation(
  meId: string,
  withUserId: string,
): Promise<{ conversation: ChatConversationDTO; meta: ChatQuota }> {
  if (meId === withUserId) throw new AppError("You cannot message yourself", 400)

  const target = await userModel.findById(withUserId).select("name avatar lastSeenAt")
  if (!target) throw new AppError("User not found", 404)

  const pairKey = canonicalPairKey(meId, withUserId)
  await Conversation.findOneAndUpdate(
    { pairKey },
    { $setOnInsert: { pairKey, participants: [meId, withUserId] } },
    { upsert: true, new: true },
  )

  // Re-read with populated participants for a consistent shape.
  const conv = await Conversation.findOne({ pairKey })
    .populate<{ participants: Array<{ _id: mongoose.Types.ObjectId; name: string; avatar?: string | null; lastSeenAt?: Date }> }>(
      "participants", "name avatar lastSeenAt",
    )
    .lean()
  if (!conv) throw new AppError("Conversation not found", 404)

  const meta = await getQuota(meId, withUserId)
  return { conversation: shapeConversation(conv, meId), meta }
}

/** All of a user's conversations, newest activity first. */
export async function listConversations(meId: string): Promise<ChatConversationDTO[]> {
  const convs = await Conversation.find({ participants: meId })
    .sort({ updatedAt: -1 })
    .populate<{ participants: Array<{ _id: mongoose.Types.ObjectId; name: string; avatar?: string | null; lastSeenAt?: Date }> }>(
      "participants", "name avatar lastSeenAt",
    )
    .lean()

  return convs.map(c => shapeConversation(c, meId))
}

/** Paginated message history (oldest→newest order), cursor on createdAt. */
export async function getMessages(
  meId: string,
  conversationId: string,
  before?: string,
): Promise<{ messages: unknown[]; hasMore: boolean }> {
  const conv = await Conversation.findById(conversationId).select("participants").lean()
  if (!conv) throw new AppError("Conversation not found", 404)
  if (!conv.participants.some(p => p.toString() === meId)) {
    throw new AppError("Forbidden", 403)
  }

  const query: Record<string, unknown> = { conversationId }
  if (before) query.createdAt = { $lt: new Date(before) }

  // Fetch newest-first, take PAGE_SIZE+1 to detect more, then reverse to ascending.
  const rows = await Message.find(query).sort({ createdAt: -1 }).limit(PAGE_SIZE + 1).lean()
  const hasMore = rows.length > PAGE_SIZE
  const page    = hasMore ? rows.slice(0, PAGE_SIZE) : rows
  return { messages: page.reverse(), hasMore }
}

/**
 * Send a message. Authoritative gate + rate limit live here.
 * Throws AppError(429) when a non-mutual sender exceeds the daily quota.
 */
export async function sendMessage(
  meId: string,
  withUserId: string,
  body: string,
  clientTempId?: string,
): Promise<{ message: unknown; conversationId: string; remaining: number | null }> {
  if (meId === withUserId) throw new AppError("You cannot message yourself", 400)

  const trimmed = body.trim()
  if (!trimmed) throw new AppError("Message body is required", 400)

  const quota = await getQuota(meId, withUserId)
  if (!quota.isMutual && (quota.remaining ?? 0) <= 0) {
    throw new AppError("Message limit reached. They need to follow you back to chat freely.", 429)
  }

  // Ensure the conversation exists (idempotent on pairKey).
  const pairKey = canonicalPairKey(meId, withUserId)
  const conv = await Conversation.findOneAndUpdate(
    { pairKey },
    { $setOnInsert: { pairKey, participants: [meId, withUserId] } },
    { upsert: true, new: true },
  )

  const message = await Message.create({
    conversationId: conv._id,
    senderId:       meId,
    recipientId:    withUserId,
    body:           trimmed,
  })

  // Update preview + bump the recipient's unread counter atomically.
  await Conversation.updateOne(
    { _id: conv._id },
    {
      $set: { lastMessage: { body: trimmed, senderId: meId, createdAt: message.createdAt } },
      $inc: { [`unread.${withUserId}`]: 1 },
    },
  )

  // Recompute remaining post-insert so the sender's banner is exact.
  const remaining = quota.isMutual
    ? null
    : Math.max(0, NON_MUTUAL_LIMIT - await recentSentCount(meId, withUserId))

  // Deliver to both rooms (recipient + sender's other tabs).
  const payload = { message, conversationId: conv._id.toString(), clientTempId, remaining }
  emitToUser(withUserId, "chat:message:new", payload)
  emitToUser(meId,       "chat:message:new", payload)

  return { message, conversationId: conv._id.toString(), remaining }
}

/** Mark a conversation read for `meId`; emit a read receipt to the other side. */
export async function markRead(meId: string, conversationId: string): Promise<void> {
  const conv = await Conversation.findById(conversationId).select("participants").lean()
  if (!conv) throw new AppError("Conversation not found", 404)
  if (!conv.participants.some(p => p.toString() === meId)) {
    throw new AppError("Forbidden", 403)
  }

  const now = new Date()
  await Conversation.updateOne(
    { _id: conversationId },
    { $set: { [`unread.${meId}`]: 0, [`lastReadAt.${meId}`]: now } },
  )
  await Message.updateMany(
    { conversationId, recipientId: meId, read: false },
    { $set: { read: true } },
  )

  const other = conv.participants.find(p => p.toString() !== meId)
  if (other) {
    emitToUser(other.toString(), "chat:read", { conversationId, by: meId, at: now })
  }
}
