import mongoose from "mongoose"
import bcrypt from "bcrypt"
import { Model } from "mongoose"

export interface IUser extends mongoose.Document {
    _id: mongoose.Types.ObjectId
    name: string
    email: string
    password: string
    token: string | null
    isVerified: boolean
    avatar?: string
    discordId?: string
    steamId?: string
    googleId?: string
    sendVerificationCode?: string
    sendVerificationCodeExpiry?: Date
    twoFactorCode?: string
    twoFactorExpiry?: Date
    resetPasswordToken?: string
    resetPasswordExpiry?: Date
    role: "user" | "admin"
}

const userSchema = new mongoose.Schema<IUser>({
    token: { type: String, default: null },
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    sendVerificationCode: String,
    isVerified: {
        type: Boolean,
        default: false
    },
    sendVerificationCodeExpiry: Date,
    password: {
        select: false,
        type: String,
        required: true,
        validate: {
            validator: function (value: string) {
                return value.length >= 8
            },
            message: "Password must be at least 8 characters long"
        }
    },
    twoFactorCode: String,
    twoFactorExpiry: Date,
    resetPasswordToken: String,
    resetPasswordExpiry: Date,
    avatar: { type: String },
    discordId: { type: String, sparse: true, index: true },
    steamId:   { type: String, sparse: true, index: true },
    googleId:  { type: String, sparse: true, index: true },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    }
}, { timestamps: true })

userSchema.index({ role: 1 })

userSchema.set("toJSON", {
    transform: (_doc, ret) => {
        const { password: _p, sendVerificationCode: _v, twoFactorCode: _t, ...rest } =
            ret as unknown as Record<string, unknown>
        return rest
    }
})

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return
    this.password = await bcrypt.hash(this.password, 12)
})

const userModel: Model<IUser> = mongoose.model<IUser>("user", userSchema)
export default userModel
