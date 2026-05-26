import mongoose, { Schema, Document } from "mongoose"

export type ProductCategory = "gamekey" | "giftcard" | "subscription" | "dlc" | "currency"
export type ProductPlatform = "PC" | "PS5" | "Xbox" | "Switch" | "Other"

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  description: string
  imageUrl: string
  rawgGameId: string | null
  rawgGameName: string | null
  platform: ProductPlatform
  category: ProductCategory
  price: number
  isActive: boolean
  totalKeys: number
  availableKeys: number
  createdAt: Date
  updatedAt: Date
}

const ProductSchema = new Schema<IProduct>({
  name:         { type: String, required: true, trim: true },
  description:  { type: String, default: "" },
  imageUrl:     { type: String, default: "" },
  rawgGameId:   { type: String, default: null },
  rawgGameName: { type: String, default: null },
  platform: {
    type: String,
    enum: ["PC", "PS5", "Xbox", "Switch", "Other"],
    required: true,
  },
  category: {
    type: String,
    enum: ["gamekey", "giftcard", "subscription", "dlc", "currency"],
    required: true,
  },
  price:         { type: Number, required: true, min: 0 },
  isActive:      { type: Boolean, default: true },
  totalKeys:     { type: Number, default: 0 },
  availableKeys: { type: Number, default: 0 },
}, { timestamps: true })

ProductSchema.index({ isActive: 1, category: 1 })
ProductSchema.index({ rawgGameId: 1 })
ProductSchema.index({ rawgGameId: 1, isActive: 1 })

export const Product = mongoose.model<IProduct>("Product", ProductSchema)
