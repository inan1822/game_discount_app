import mongoose, { Schema, Document } from "mongoose"

export type KeyStatus = "available" | "reserved" | "sold"

export interface IGameKey extends Document {
  _id: mongoose.Types.ObjectId
  productId: mongoose.Types.ObjectId
  code: string
  status: KeyStatus
  reservedAt: Date | null
  reservedByOrderId: mongoose.Types.ObjectId | null
  soldAt: Date | null
  soldInOrderId: mongoose.Types.ObjectId | null
  createdAt: Date
}

const GameKeySchema = new Schema<IGameKey>({
  productId:         { type: Schema.Types.ObjectId, ref: "Product", required: true },
  // select: false — code is never returned unless explicitly projected
  code:              { type: String, required: true, select: false },
  status:            { type: String, enum: ["available", "reserved", "sold"], default: "available" },
  reservedAt:        { type: Date, default: null },
  reservedByOrderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },
  soldAt:            { type: Date, default: null },
  soldInOrderId:     { type: Schema.Types.ObjectId, ref: "Order", default: null },
}, { timestamps: { createdAt: true, updatedAt: false } })

// Compound index for fast stock queries (how many available for product X?)
GameKeySchema.index({ productId: 1, status: 1 })
// Unique constraint on code — prevents duplicate key upload
GameKeySchema.index({ code: 1 }, { unique: true })

export const GameKey = mongoose.model<IGameKey>("GameKey", GameKeySchema)
