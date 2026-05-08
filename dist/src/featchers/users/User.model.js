import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { cartItemSchema } from "../cart/cart.model.js";
const addressSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId },
    street: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    zipCode: { type: String, required: true }
});
const userSchema = new mongoose.Schema({
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
        unique: true, // is index already
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
            validator: function (value) {
                // Only validate raw password (not hashed)
                return value.length >= 8;
            },
            message: "Password must be at least 8 characters long"
        }
    },
    twoFactorCode: String,
    twoFactorExpiry: Date,
    resetPasswordToken: String,
    resetPasswordExpiry: Date,
    role: {
        type: String,
        enum: ["customer", "admin"],
        default: "customer"
    },
    addresses: {
        type: [addressSchema],
        default: []
    },
    cart: {
        type: [cartItemSchema],
        default: []
    }
}, { timestamps: true });
userSchema.index({ role: 1 });
userSchema.set("toJSON", {
    transform: (_doc, ret) => {
        const { password: _p, verificationCode: verificationCode, ...rest } = ret;
        return rest;
    }
});
userSchema.pre("save", async function () {
    if (!this.isModified("password"))
        return;
    this.password = await bcrypt.hash(this.password, 12);
});
const userModel = mongoose.model("user", userSchema);
export default userModel;
//# sourceMappingURL=User.model.js.map