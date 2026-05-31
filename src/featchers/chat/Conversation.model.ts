import mongoose, { Schema, Document } from "mongoose"

/**
 * A 1:1 conversation between two users.
 *
 * `pairKey` is the canonical, order-independent key for the participant pair
 * ([a,b].sort().join("_")). A unique index on it guarantees the same two users
 * always resolve to exactly one Conversation, regardless of who started it.
 *
 * `unread` / `lastReadAt` are Maps keyed by the userId string so we can do
 * atomic dotted updates (e.g. `$inc unread.<recipientId>`) without array-index
 * ambiguity. They serialise to plain objects in JSON.
 */
export interface IConversation extends Document {
  _id:          mongoose.Types.ObjectId
  pairKey:      string
  participants: mongoose.Types.ObjectId[]
  lastMessage:  { body: string; senderId: mongoose.Types.ObjectId; createdAt: Date } | null
  unread:       Map<string, number>
  lastReadAt:   Map<string, Date>
  createdAt:    Date
  updatedAt:    Date
}

const LastMessageSchema = new Schema(
  {
    body:      { type: String, required: true },
    senderId:  { type: Schema.Types.ObjectId, ref: "user", required: true },
    createdAt: { type: Date, required: true },
  },
  { _id: false },
)

const ConversationSchema = new Schema<IConversation>(
  {
    pairKey:      { type: String, required: true, unique: true },
    participants: { type: [{ type: Schema.Types.ObjectId, ref: "user" }], required: true },
    lastMessage:  { type: LastMessageSchema, default: null },
    unread:       { type: Map, of: Number, default: {} },
    lastReadAt:   { type: Map, of: Date,   default: {} },
  },
  { timestamps: true },
)

// List a user's conversations newest-first.
ConversationSchema.index({ participants: 1, updatedAt: -1 })

export const Conversation = mongoose.model<IConversation>("Conversation", ConversationSchema)
