import mongoose, { Model } from "mongoose"

export interface IBug extends mongoose.Document {
    userId: mongoose.Types.ObjectId | null
    steps: string
    expected: string
    device: string
    email: string | null
    createdAt: Date
}

const bugSchema = new mongoose.Schema<IBug>({
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    steps:    { type: String, required: true, maxlength: 5000 },
    expected: { type: String, required: true, maxlength: 2000 },
    device:   { type: String, required: true, maxlength: 300 },
    email:    { type: String, default: null },
}, { timestamps: true })

bugSchema.index({ createdAt: -1 })

const BugModel: Model<IBug> = mongoose.model<IBug>("bug", bugSchema)
export default BugModel
