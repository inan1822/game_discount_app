import bcrypt from "bcrypt"
import userModel from "./User.model.js"
import { getErrorInfo } from "../../shared/utils/AppError.js"
import { Request, Response } from "express"
import WishlistModel from "../wishlist/Wishlist.model.js"

export const getUser = async (req: Request, res: Response) => {
    try {
        const user = await userModel
            .findById(req.params.id)
            .select("-token -sendVerificationCode -sendVerificationCodeExpiry -resetPasswordToken -resetPasswordExpiry")
            .lean()

        if (!user) return res.status(404).json({ status: "404", message: "User not found", data: null })

        return res.status(200).json({ status: "200", message: "OK", data: user })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const getAll = async (_req: Request, res: Response) => {
    try {
        const users = await userModel.find().select("-password").lean()
        res.status(200).json({ status: "200", message: "OK", count: users.length, data: users })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const user = await userModel.findById(req.params.id)
        if (!user) return res.status(404).json({ status: "404", message: "User not found", data: null })

        // Also delete their wishlist
        await WishlistModel.deleteMany({ userId: req.params.id })
        await userModel.findByIdAndDelete(req.params.id)

        res.status(200).json({ status: "200", message: `User ${user.email} deleted`, data: null })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const deleteMyUser = async (req: Request, res: Response) => {
    try {
        const user = await userModel.findById(req.params.id).select("+password")
        if (!user) return res.status(404).json({ status: "404", message: "User not found", data: null })

        const isPasswordCorrect = await bcrypt.compare(req.body.password, user.password)
        if (!isPasswordCorrect) return res.status(401).json({ status: "401", message: "Incorrect password", data: null })

        await WishlistModel.deleteMany({ userId: req.params.id })
        await userModel.findByIdAndDelete(req.params.id)

        res.status(200).json({ status: "200", message: "Account deleted", data: null })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const updateUser = async (req: Request, res: Response) => {
    try {
        const { name, email, currentPassword, newPassword } = req.body
        const user = await userModel.findById(req.params.id).select("+password")
        if (!user) return res.status(404).json({ status: "404", message: "User not found", data: null })

        if (email || newPassword) {
            const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password)
            if (!isPasswordCorrect) return res.status(401).json({ status: "401", message: "Incorrect password", data: null })
        }

        if (name) user.name = name
        if (email) user.email = email
        if (newPassword) user.password = newPassword

        const updated = await user.save()
        res.status(200).json({ status: "200", message: "User updated", data: updated })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const promoteToAdmin = async (req: Request, res: Response) => {
    try {
        const user = await userModel.findByIdAndUpdate(req.params.id, { role: "admin" }, { new: true })
        if (!user) return res.status(404).json({ status: "404", message: "User not found", data: null })
        res.status(200).json({ status: "200", message: `${user.name} promoted to admin`, data: user })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}
