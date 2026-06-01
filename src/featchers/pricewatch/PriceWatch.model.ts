import mongoose from "mongoose"

export interface IPriceWatch extends mongoose.Document {
    userId:        mongoose.Types.ObjectId
    gameId:        string    // RAWG game id
    gameName:      string
    gameSlug:      string
    steamAppId:    number | null  // Steam App ID for reliable ITAD lookup
    itadId:        string | null  // cached ITAD UUID
    itadCachedAt:  Date | null
    lastSeenPrice: number | null  // current price in USD at last check
    lastSeenCut:   number | null  // % off at last check
    lastNotifiedAt: Date | null
}

const schema = new mongoose.Schema<IPriceWatch>({
    userId:        { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    gameId:        { type: String, required: true },
    gameName:      { type: String, required: true },
    gameSlug:      { type: String, required: true },
    steamAppId:    { type: Number, default: null },
    itadId:        { type: String, default: null },
    itadCachedAt:  { type: Date,   default: null },
    lastSeenPrice: { type: Number, default: null },
    lastSeenCut:   { type: Number, default: null },
    lastNotifiedAt:{ type: Date,   default: null },
}, { timestamps: true })

schema.index({ userId: 1, gameId: 1 }, { unique: true })
schema.index({ steamAppId: 1 })
schema.index({ itadId: 1 })

const PriceWatch = mongoose.model<IPriceWatch>("pricewatch", schema)
export default PriceWatch
