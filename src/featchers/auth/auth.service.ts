import bcrypt from "bcrypt"
import crypto from "crypto"
import jwt from "jsonwebtoken"
import userModel from "../users/User.model.js"
import {
    sendVerificationEmail,
    sendResetPasswordEmail
} from "../../shared/utils/mailer.js"
import { AppError } from "../../shared/utils/AppError.js"
import mongoose from "mongoose"

// 6-digit OTP for 2FA / email verify (user types it manually)
const generateCode = () => crypto.randomInt(100000, 1000000).toString()

// 64-char hex token for password reset links (unguessable — 2^256 space)
const generateResetToken = () => crypto.randomBytes(32).toString("hex")

// SHA-256 one-way hash for OTP/reset tokens stored in DB.
// We email the plain value, store only the hash — breach-safe.
function hashCode(code: string): string {
    return crypto.createHash("sha256").update(code).digest("hex")
}

interface TwoFactorResponse {
    requiresTwoFactor: true
}

interface LoginResponse {
    requiresTwoFactor: false
    token: string
    userID: mongoose.Types.ObjectId
}

// Properly-formed bcrypt hash (correct length) used as a timing-attack dummy
// when a login email is not found — keeps response time constant.
const DUMMY_HASH = "$2b$12$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
export const registerService = async ({ name, email, password }: { name: string, email: string, password: string }) => {
    const existingUser = await userModel.findOne({ email })
    if (existingUser) {
        throw new AppError("User with this email already exists", 409)
    }

    const code = generateCode()

    const newUser = await userModel.create({
        name,
        email,
        password,
        sendVerificationCode: hashCode(code),       // store hash, email plain code
        sendVerificationCodeExpiry: Date.now() + 24 * 60 * 60 * 1000
    })

    await sendVerificationEmail(email, code)

    return newUser
}


export const verifyEmailService = async ({ email, code }: { email: string, code: string }): Promise<string> => {
    const user = await userModel
        .findOne({ email })
        .select("+sendVerificationCode +sendVerificationCodeExpiry")
    if (!user) {
        throw new AppError("User not found", 404)
    }

    if (user.sendVerificationCodeExpiry && user.sendVerificationCodeExpiry < new Date()) {
        throw new AppError("Verification code has expired", 400)
    }

    // Timing-safe comparison: `!==` on hex strings is short-circuit; an attacker
    // measuring server response time could infer matching prefix length and brute-force
    // the 6-digit code. crypto.timingSafeEqual compares in constant time.
    const storedHash = Buffer.from(user.sendVerificationCode ?? "", "hex")
    const incomingHash = Buffer.from(hashCode(code), "hex")
    if (
        storedHash.length === 0 ||
        storedHash.length !== incomingHash.length ||
        !crypto.timingSafeEqual(storedHash, incomingHash)
    ) {
        throw new AppError("Invalid code", 400)
    }

    user.isVerified = true
    user.sendVerificationCode = undefined
    await user.save()

    return "Email verified successfully"
}

export const loginService = async ({ email, password }: { email: string, password: string }): Promise<TwoFactorResponse | LoginResponse> => {
    const user = await userModel.findOne({ email }).select("+password")

    // Always run bcrypt.compare — even when user not found — to prevent timing attacks
    const isPasswordCorrect = user
        ? await bcrypt.compare(password, user.password)
        : await bcrypt.compare(password, DUMMY_HASH)

    if (!user || !isPasswordCorrect) {
        throw new AppError("Invalid credentials", 401)
    }

    if (!user.isVerified) {
        throw new AppError("User not verified", 403)
    }

    // admin needs 2FA
    if (user.role === "admin") {
        const code = generateCode()
        user.twoFactorCode = hashCode(code)         // store hash, email plain code
        user.twoFactorExpiry = new Date(Date.now() + 10 * 60 * 1000)
        await user.save()
        await sendVerificationEmail(email, code)
        return { requiresTwoFactor: true }

    }
    if (!process.env.JWT_SECRET)
        throw new AppError("JWT_SECRET is not defined", 500)

    const token = jwt.sign(
        { id: user._id, name: user.name, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "2h" }
    )

    await userModel.findByIdAndUpdate(user._id, { token })

    return {
        requiresTwoFactor: false,
        token,
        userID: user._id
    }
}


export const verifyTwoFactorService = async ({ email, code }: { email: string, code: string }) => {
    const user = await userModel
        .findOne({
            email,
            twoFactorCode: hashCode(code),          // compare against stored hash
            twoFactorExpiry: { $gt: Date.now() }
        })
        .select("+twoFactorCode +twoFactorExpiry")

    if (!user) {
        throw new AppError("Invalid or expired code", 400)
    }

    if (!process.env.JWT_SECRET)
        throw new AppError("JWT_SECRET is not defined", 500)

    user.twoFactorCode = undefined
    user.twoFactorExpiry = undefined
    await user.save()

    const token = jwt.sign(
        { id: user._id, name: user.name, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "2h" }
    )

    await userModel.findByIdAndUpdate(user._id, { token })

    return { token, userID: user._id }
}

export const logoutService = async (userId: string) => {
    await userModel.findByIdAndUpdate(userId, { $unset: { token: "" } })
}

export const getMeService = async (userId: string) => {
    const user = await userModel.findById(userId).select("-password").lean()
    if (!user) {
        throw new AppError("User not found", 404)
    }
    return user
}


export const resendVerificationService = async (email: string) => {
    const user = await userModel.findOne({ email })
    // Anti-enumeration: always return success whether the email exists or not
    if (!user) return { message: "Verification email resent" }
    if (user.isVerified) throw new AppError("Email already verified", 400)

    const code = generateCode()
    user.sendVerificationCode = hashCode(code)      // store hash, email plain code
    user.sendVerificationCodeExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await user.save()

    await sendVerificationEmail(email, code)
    return { message: "Verification email resent" }
}

export const requestPasswordResetService = async (email: string) => {
    const user = await userModel.findOne({ email })
    // Anti-enumeration: always return the same vague response
    if (!user) return { message: "If that email is registered, a reset link was sent" }

    const resetToken = generateResetToken()          // 64-char hex — not guessable
    user.resetPasswordToken = hashCode(resetToken)  // store hash, email plain token
    user.resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000)
    await user.save()

    await sendResetPasswordEmail(email, resetToken)

    return { message: "If that email is registered, a reset link was sent" }
}


export const resetPasswordService = async ({ token, newPassword }: { token: string, newPassword: string }) => {
    const user = await userModel
        .findOne({
            resetPasswordToken: hashCode(token),    // compare against stored hash
            resetPasswordExpiry: { $gt: Date.now() }
        })
        .select("+resetPasswordToken +resetPasswordExpiry")

    if (!user) {
        throw new AppError("Invalid or expired token", 400)
    }

    user.password = newPassword
    user.resetPasswordToken = undefined
    user.resetPasswordExpiry = undefined
    await user.save()

    return { message: "Password reset successfully" }
}