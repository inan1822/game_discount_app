import bcrypt from "bcrypt"
import userModel from "./User.model.js"
import { getErrorInfo } from "../../shared/utils/AppError.js"
import { Request, Response } from "express"
import WishlistModel from "../wishlist/Wishlist.model.js"
import { getAvatarGalleryService, updateAvatarService, editProfileService, confirmPendingEmailService, changePasswordService, disconnectProviderService, deleteAccountService } from "./users.service.js"

export const getMyStats = async (req: Request, res: Response) => {
    try {
        const user = await userModel
            .findById(req.user!.id)
            .select("following followers")
            .lean()
        if (!user) return res.status(404).json({ status: "404", message: "User not found", data: null })

        const favorites = await WishlistModel.countDocuments({ userId: req.user!.id })

        return res.status(200).json({
            status: "200",
            message: "OK",
            data: {
                following: user.following?.length ?? 0,
                followers: user.followers?.length ?? 0,
                favorites,
            },
        })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

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
        const user = await userModel.findById(req.user!.id).select("+password")
        if (!user) return res.status(404).json({ status: "404", message: "User not found", data: null })

        const isPasswordCorrect = await bcrypt.compare(req.body.password, user.password)
        if (!isPasswordCorrect) return res.status(401).json({ status: "401", message: "Incorrect password", data: null })

        await WishlistModel.deleteMany({ userId: req.user!.id })
        await userModel.findByIdAndDelete(req.user!.id)

        res.status(200).json({ status: "200", message: "Account deleted", data: null })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const updateUser = async (req: Request, res: Response) => {
    try {
        const { name, email, currentPassword, newPassword } = req.body
        const user = await userModel.findById(req.user!.id).select("+password")
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

export const getAvatarGallery = (_req: Request, res: Response) => {
    res.status(200).json({ status: "200", message: "OK", data: getAvatarGalleryService() })
}

export const updateAvatar = async (req: Request, res: Response) => {
    try {
        const { avatarUrl: presetPath } = req.body as { avatarUrl?: string }
        const avatarUrl = await updateAvatarService(req.user!.id, {
            presetPath,
            file: req.file,
        })
        res.status(200).json({ status: "200", message: "Avatar updated", data: { avatarUrl } })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const editProfile = async (req: Request, res: Response) => {
    try {
        const { name, email, currentPassword } = req.body as {
            name?: string; email?: string; currentPassword: string
        }
        const result = await editProfileService(req.user!.id, { name, email, currentPassword })
        if (result.emailChangePending) {
            return res.status(200).json({
                status: "200",
                message: "Profile updated. A verification code was sent to your new email address.",
                data: { emailChangePending: true },
            })
        }
        return res.status(200).json({ status: "200", message: "Profile updated", data: result.user })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const confirmPendingEmail = async (req: Request, res: Response) => {
    try {
        const { code } = req.body as { code: string }
        const user = await confirmPendingEmailService(req.user!.id, code)
        res.status(200).json({ status: "200", message: "Email updated", data: user })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const changePassword = async (req: Request, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body as {
            currentPassword: string; newPassword: string
        }
        await changePasswordService(req.user!.id, { currentPassword, newPassword })
        // Clear the auth cookie — user must log in again with the new password
        res.clearCookie("dislow_token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
        })
        res.status(200).json({ status: "200", message: "Password changed. Please log in again.", data: null })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const disconnectProvider = async (req: Request, res: Response) => {
    try {
        const provider = String(req.params.provider)
        if (!["google", "discord", "steam"].includes(provider)) {
            return res.status(400).json({ status: "400", message: "Invalid provider", data: null })
        }
        await disconnectProviderService(req.user!.id, provider as "google" | "discord" | "steam")
        res.status(200).json({ status: "200", message: `${provider} disconnected`, data: null })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const updateNotificationPrefs = async (req: Request, res: Response) => {
    try {
        const { events, discounts } = req.body as { events?: boolean; discounts?: boolean }
        const update: Record<string, boolean> = {}
        if (typeof events === "boolean")    update["notificationPrefs.events"]    = events
        if (typeof discounts === "boolean") update["notificationPrefs.discounts"] = discounts

        if (Object.keys(update).length === 0) {
            return res.status(400).json({ status: "400", message: "No valid fields provided", data: null })
        }

        const updated = await userModel
            .findByIdAndUpdate(req.user!.id, { $set: update }, { new: true })
            .select("notificationPrefs")
            .lean()

        if (!updated) return res.status(404).json({ status: "404", message: "User not found", data: null })
        return res.status(200).json({ status: "200", message: "Preferences updated", data: updated.notificationPrefs })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const deleteAccount = async (req: Request, res: Response) => {
    try {
        const { password, confirmPhrase } = req.body as { password: string; confirmPhrase: string }
        await deleteAccountService(req.user!.id, { password, confirmPhrase })
        res.clearCookie("dislow_token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
        })
        res.status(200).json({ status: "200", message: "Account deleted", data: null })
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
