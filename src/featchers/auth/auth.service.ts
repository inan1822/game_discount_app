import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import userModel from "../users/User.model.js"
import {
    sendVerificationEmail,
    sendResetPasswordEmail
} from "../../shared/utils/mailer.js"


import { AppError } from "../../shared/utils/AppError.js"

const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
}
interface TwoFactorResponse {
    requiresTwoFactor: true
}

interface LoginResponse {
    requiresTwoFactor: false
    token: string
    userID: any
}
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
        sendVerificationCode: code,
        sendVerificationCodeExpiry: Date.now() + 24 * 60 * 60 * 1000
    })

    await sendVerificationEmail(email, code)

    return newUser
}


export const verifyEmailService = async ({ email, code }: { email: string, code: string }): Promise<string> => {
    const user = await userModel.findOne({ email })
    if (!user) {
        throw new AppError("User not found", 404)
    }

    if (user.sendVerificationCode !== code) {
        throw new AppError("Invalid code", 400)
    }

    user.isVerified = true
    user.sendVerificationCode = undefined
    await user.save()

    return "Email verified successfully"
}

export const loginService = async ({ email, password }: { email: string, password: string }): Promise<TwoFactorResponse | LoginResponse> => {
    const user = await userModel.findOne({ email }).select("+password")
    if (!user) {
        throw new AppError(`User with ${email} not found`, 401)
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password)
    if (!isPasswordCorrect) {
        throw new AppError("Invalid password", 401)
    }

    if (!user.isVerified) {
        throw new AppError("User not verified", 403)
    }

    // admin needs 2FA
    if (user.role === "admin") {
        const code = generateCode()
        user.twoFactorCode = code
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
    const user = await userModel.findOne({
        email,
        twoFactorCode: code,
        twoFactorExpiry: { $gt: Date.now() }
    })

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

    return { token }
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


export const requestPasswordResetService = async (email: string) => {
    const user = await userModel.findOne({ email })
    if (!user) {
        throw new AppError("User not found", 404)
    }

    const resetToken = generateCode()
    user.resetPasswordToken = resetToken
    user.resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000)
    await user.save()

    await sendResetPasswordEmail(email, resetToken)

    return { message: "Password reset email sent" }
}


export const resetPasswordService = async ({ token, newPassword }: { token: string, newPassword: string }) => {
    const user = await userModel.findOne({
        resetPasswordToken: token,
        resetPasswordExpiry: { $gt: Date.now() }
    })

    if (!user) {
        throw new AppError("Invalid or expired token", 400)
    }

    user.password = newPassword
    user.resetPasswordToken = undefined
    user.resetPasswordExpiry = undefined
    await user.save()

    return { message: "Password reset successfully" }
}