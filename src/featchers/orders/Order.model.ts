import mongoose, { Schema, Document } from "mongoose"

export type OrderStatus = "pending" | "paid" | "delivered" | "cancelled" | "refunded"
export type EmailStatus = "pending" | "sent" | "failed"

export interface IOrderItem {
  productId: mongoose.Types.ObjectId
  productName: string   // snapshot at order time
  keyId: mongoose.Types.ObjectId | null
  quantity: number
  unitPrice: number
}

export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId
  customerEmail: string
  customerUserId: mongoose.Types.ObjectId
  items: IOrderItem[]
  totalAmount: number
  discountAmount: number
  promoCode: string | null
  status: OrderStatus
  paymentRef: string
  emailStatus: EmailStatus
  emailSentAt: Date | null
  keyAssignedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const OrderItemSchema = new Schema<IOrderItem>({
  productId:   { type: Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true },
  keyId:       { type: Schema.Types.ObjectId, ref: "GameKey", default: null },
  quantity:    { type: Number, required: true, min: 1 },
  unitPrice:   { type: Number, required: true, min: 0 },
}, { _id: false })

const OrderSchema = new Schema<IOrder>({
  customerEmail:  { type: String, required: true, lowercase: true, trim: true },
  customerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  items:          { type: [OrderItemSchema], required: true },
  totalAmount:    { type: Number, required: true, min: 0 },
  discountAmount: { type: Number, default: 0 },
  promoCode:      { type: String, default: null },
  status: {
    type: String,
    enum: ["pending", "paid", "delivered", "cancelled", "refunded"],
    default: "pending",
  },
  paymentRef:    { type: String, default: "" },
  emailStatus:   { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
  emailSentAt:   { type: Date, default: null },
  keyAssignedAt: { type: Date, default: null },
}, { timestamps: true })

// Fast lookups by status (admin filters) and by customer
OrderSchema.index({ status: 1, createdAt: -1 })
OrderSchema.index({ customerEmail: 1 })
OrderSchema.index({ createdAt: -1 })

export const Order = mongoose.model<IOrder>("Order", OrderSchema)
