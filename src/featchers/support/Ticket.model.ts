import mongoose, { Schema, Document } from "mongoose"

export type TicketSubject =
  | "key_not_working"
  | "key_already_used"
  | "wrong_region"
  | "bought_by_mistake"
  | "wrong_product"
  | "missing_key"
  | "other"

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed"

export interface ITicketMessage {
  senderRole: "user" | "admin"
  senderId:   mongoose.Types.ObjectId
  body:       string
  createdAt:  Date
}

export interface ITicket extends Document {
  _id:         mongoose.Types.ObjectId
  userId:      mongoose.Types.ObjectId
  userEmail:   string
  orderId:     mongoose.Types.ObjectId
  orderRef:    string          // last 8 chars of orderId, uppercase — for display
  productName: string          // snapshot from order
  subject:     TicketSubject
  description: string
  status:      TicketStatus
  messages:    ITicketMessage[]
  createdAt:   Date
  updatedAt:   Date
}

const TicketMessageSchema = new Schema<ITicketMessage>(
  {
    senderRole: { type: String, enum: ["user", "admin"], required: true },
    senderId:   { type: Schema.Types.ObjectId, required: true },
    body:       { type: String, required: true, maxlength: 5000 },
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } },
)

const TicketSchema = new Schema<ITicket>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: "User",  required: true },
    userEmail:   { type: String, required: true },
    orderId:     { type: Schema.Types.ObjectId, ref: "Order", required: true },
    orderRef:    { type: String, required: true },
    productName: { type: String, required: true },
    subject: {
      type: String,
      enum: ["key_not_working", "key_already_used", "wrong_region",
             "bought_by_mistake", "wrong_product", "missing_key", "other"],
      required: true,
    },
    description: { type: String, required: true, minlength: 10, maxlength: 3000 },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },
    messages: { type: [TicketMessageSchema], default: [] },
  },
  { timestamps: true },
)

TicketSchema.index({ userId: 1, createdAt: -1 })
TicketSchema.index({ status: 1, createdAt: -1 })
TicketSchema.index({ orderId: 1 })

export const Ticket = mongoose.model<ITicket>("Ticket", TicketSchema)
