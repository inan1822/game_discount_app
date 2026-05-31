import mongoose, { Schema, Document } from "mongoose"

// Manual store/website link an admin attaches to a game. Covers cases that
// ITAD/CheapShark can't (developer's own store, console store pages, itch.io,
// games with no ITAD entry). Surfaced on the game detail page Discounts tab,
// merged into the auto store list and filtered by the selected platform chip.
export type ManualLinkPlatform = "pc" | "ps" | "xbox" | "switch" | "all"

export interface IGameManualLink extends Document {
  _id:                 mongoose.Types.ObjectId
  rawgId:              string                 // RAWG game id this link belongs to
  rawgName:            string                 // denormalized game name — for the admin list
  label:               string                 // e.g. "Buy on Rockstar Store"
  url:                 string
  platform:            ManualLinkPlatform     // "all" = shown under every platform chip
  price:               number | null          // null → renders as "View →" (no price)
  storeIcon:           string                 // optional icon URL; "" → favicon/letter fallback
  note:                string                 // optional context, e.g. "Requires launcher"
  // Subscription — when set, the game is included in this subscription service
  subscriptionName:    string | null          // e.g. "PS Plus Extra", "Xbox Game Pass"
  // Discount lifecycle — admin sets an expiry; controller auto-hides past this date
  discountExpiresAt:   Date | null
  // Stock tracking — admin manually flags limited-stock deals
  isLimitedStock:      boolean                // show "Limited" badge to users
  inStock:             boolean                // admin toggles to false when stock runs out
  isActive:            boolean
  // Health ping (Tier 2) — updated every 24h by healthPinger.ts
  healthStatus:        "ok" | "dead" | "unknown"
  lastHealthCheck:     Date | null
  // Smart AI tracking (Tier 3) — admin opts specific links into Haiku monitoring
  aiTracking:          boolean
  // Consecutive checks where Haiku returned null (no price, no stock info)
  // After 3 → auto-disabled to stop burning tokens on unscrapeable sites
  aiTrackFailures:     number
  createdBy:           mongoose.Types.ObjectId
  createdAt:           Date
  updatedAt:           Date
}

const gameManualLinkSchema = new Schema<IGameManualLink>({
  rawgId:    { type: String, required: true, trim: true, index: true },
  rawgName:  { type: String, default: "", trim: true },
  label:     { type: String, required: true, trim: true },
  url:       { type: String, required: true, trim: true },
  platform:  { type: String, enum: ["pc", "ps", "xbox", "switch", "all"], default: "all" },
  price:               { type: Number,  default: null, min: 0 },
  storeIcon:           { type: String,  default: "" },
  note:                { type: String,  default: "" },
  subscriptionName:    { type: String,  default: null },
  discountExpiresAt:   { type: Date,    default: null },
  isLimitedStock:      { type: Boolean, default: false },
  inStock:             { type: Boolean, default: true },
  isActive:            { type: Boolean, default: true },
  healthStatus:        { type: String, enum: ["ok", "dead", "unknown"], default: "unknown" },
  lastHealthCheck:     { type: Date,    default: null },
  aiTracking:          { type: Boolean, default: false },
  aiTrackFailures:     { type: Number,  default: 0 },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true })

gameManualLinkSchema.index({ rawgId: 1, isActive: 1 })

export const GameManualLink = mongoose.model<IGameManualLink>(
  "GameManualLink",
  gameManualLinkSchema,
)
