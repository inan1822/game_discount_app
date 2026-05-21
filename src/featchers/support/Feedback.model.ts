import mongoose, { Model } from "mongoose"

export interface IFeedback extends mongoose.Document {
    userId: mongoose.Types.ObjectId | null
    text: string
    email: string | null
    createdAt: Date
}

const feedbackSchema = new mongoose.Schema<IFeedback>({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    text:   { type: String, required: true, maxlength: 5000 },
    email:  { type: String, default: null },
}, { timestamps: true })

feedbackSchema.index({ createdAt: -1 })

const FeedbackModel: Model<IFeedback> = mongoose.model<IFeedback>("feedback", feedbackSchema)
export default FeedbackModel
