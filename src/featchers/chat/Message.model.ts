import mongoose, { Schema, Document } from "mongoose"

/**
 * A single chat message.
 *
 * `recipientId` is denormalised (it's always the other participant) so the
 * non-mutual rate limit — "≤3 messages per rolling 24h from sender→recipient" —
 * is a single indexed countDocuments instead of a join through Conversation.
 *
 * senderId / recipientId are ALWAYS derived server-side from the authenticated
 * user — never from the request body.
 */
export interface IMessage extends Document {
  _id:            mongoose.Types.ObjectId
  conversationId: mongoose.Types.ObjectId
  senderId:       mongoose.Types.ObjectId
  recipientId:    mongoose.Types.ObjectId
  body:           string
  read:           boolean
  createdAt:      Date
  updatedAt:      Date
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    senderId:       { type: Schema.Types.ObjectId, ref: "user", required: true },
    recipientId:    { type: Schema.Types.ObjectId, ref: "user", required: true },
    body:           { type: String, required: true, trim: true, maxlength: 2000 },
    read:           { type: Boolean, default: false },
  },
  { timestamps: true },
)

// Paginated thread load (newest-first cursor on createdAt).
MessageSchema.index({ conversationId: 1, createdAt: -1 })
// Rate-limit count: messages from sender → recipient within the last 24h.
MessageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 })

export const Message = mongoose.model<IMessage>("Message", MessageSchema)
