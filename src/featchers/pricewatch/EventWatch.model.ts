import mongoose from "mongoose"

export interface IEventWatch extends mongoose.Document {
    userId:          mongoose.Types.ObjectId
    gameId:          string    // RAWG game id
    gameName:        string
    gameSlug:        string
    steamAppId:      number | null  // resolved from RAWG stores
    lastSeenNewsGid: number | null  // Steam news item GID we last notified about
    lastNotifiedAt:  Date | null
}

const schema = new mongoose.Schema<IEventWatch>({
    userId:          { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    gameId:          { type: String, required: true },
    gameName:        { type: String, required: true },
    gameSlug:        { type: String, required: true },
    steamAppId:      { type: Number, default: null },
    lastSeenNewsGid: { type: Number, default: null },
    lastNotifiedAt:  { type: Date,   default: null },
}, { timestamps: true })

schema.index({ userId: 1, gameId: 1 }, { unique: true })
schema.index({ steamAppId: 1 })

const EventWatch = mongoose.model<IEventWatch>("eventwatch", schema)
export default EventWatch
