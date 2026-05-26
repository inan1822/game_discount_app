import mongoose from "mongoose"
import { Model } from "mongoose"

export type PromoType = "percent" | "fixed"

export interface IPromoCode extends mongoose.Document {
  _id:            mongoose.Types.ObjectId
  code:           string          // uppercase, unique
  type:           PromoType
  value:          number          // % or $ amount
  minOrderAmount: number          // minimum cart value to apply
  maxUses:        number | null   // null = unlimited
  usedCount:      number
  expiresAt:      Date | null
  isActive:       boolean
  createdAt:      Date
  updatedAt:      Date
}

const promoCodeSchema = new mongoose.Schema<IPromoCode>({
  code:           { type: String, required: true, unique: true, uppercase: true, trim: true },
  type:           { type: String, enum: ["percent", "fixed"], required: true },
  value:          { type: Number, required: true, min: 0 },
  minOrderAmount: { type: Number, default: 0, min: 0 },
  maxUses:        { type: Number, default: null },
  usedCount:      { type: Number, default: 0 },
  expiresAt:      { type: Date,   default: null },
  isActive:       { type: Boolean, default: true },
}, { timestamps: true })

promoCodeSchema.index({ isActive: 1 })

export const PromoCode: Model<IPromoCode> =
  mongoose.model<IPromoCode>("PromoCode", promoCodeSchema)
