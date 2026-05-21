import mongoose from "mongoose"
import { Model } from "mongoose"

export interface INotification extends mongoose.Document {
    _id: mongoose.Types.ObjectId
    userId: mongoose.Types.ObjectId
    type: "event" | "discount"
    title: string
    body: string
    gameId: number | null
    gameSlug: string | null
    link: string | null
    read: boolean
    createdAt: Date
}

const notificationSchema = new mongoose.Schema<INotification>({
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    type:     { type: String, enum: ["event", "discount"], required: true },
    title:    { type: String, required: true, maxlength: 200 },
    body:     { type: String, default: "" },
    gameId:   { type: Number, default: null },
    gameSlug: { type: String, default: null },
    link:     { type: String, default: null },
    read:     { type: Boolean, default: false },
}, { timestamps: true })

notificationSchema.index({ userId: 1, createdAt: -1 })
notificationSchema.index({ userId: 1, read: 1 })
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }) // 30-day TTL

const NotificationModel: Model<INotification> = mongoose.model<INotification>("notification", notificationSchema)
export default NotificationModel
