import { Router } from "express"
import rateLimit from "express-rate-limit"
import { authMiddleware } from "../../shared/middlewares/shared.middlewares.js"
import { isAdmin } from "../../shared/middlewares/shared.admin.js"
import { getUser, getAll, deleteUser, updateUser, promoteToAdmin, deleteMyUser, getMyStats, getAvatarGallery, updateAvatar, updateNotificationPrefs, editProfile, confirmPendingEmail, changePassword, disconnectProvider, deleteAccount } from "./users.controller.js"
import { uploadAvatarSingle } from "./avatar.middleware.js"
import { validateRequest } from "../../shared/middlewares/validateRequst.js"
import { editProfileSchema, changePasswordSchema, confirmPendingEmailSchema, deleteAccountSchema } from "../../shared/validators/profile.schemas.js"

// Strict limiter for sensitive profile mutation endpoints (5 req / 15 min per IP)
const profileMutateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: "429", message: "Too many attempts, please try again later", data: null },
})

// Delete account — extra strict: 3 attempts per day
const deleteAccountLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    limit: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: "429", message: "Too many delete attempts. Please try again tomorrow.", data: null },
})

const userRouter: Router = Router()

// Admin: get all users
userRouter.get("/admin", authMiddleware, isAdmin, getAll)

// Authenticated user: own profile stats (MUST be declared before /:id so "me" isn't treated as an ObjectId)
userRouter.get("/me/stats", authMiddleware, getMyStats)

// Avatar gallery (preset paths — public, no auth needed)
userRouter.get("/me/avatar-gallery", getAvatarGallery)

// Update avatar: JSON body { avatarUrl } for presets, multipart/form-data for custom upload
userRouter.patch("/me/avatar", authMiddleware, uploadAvatarSingle, updateAvatar)

// Update notification preferences
userRouter.patch("/me/notification-prefs", authMiddleware, updateNotificationPrefs)

// Edit profile (name / email) — requires currentPassword reauth
userRouter.patch("/me/profile", profileMutateLimiter, authMiddleware, validateRequest(editProfileSchema, "body"), editProfile)

// Confirm pending email change (6-digit code sent to new address)
userRouter.post("/me/confirm-email", profileMutateLimiter, authMiddleware, validateRequest(confirmPendingEmailSchema, "body"), confirmPendingEmail)

// Change password — clears session cookie on success
userRouter.patch("/me/password", profileMutateLimiter, authMiddleware, validateRequest(changePasswordSchema, "body"), changePassword)

// Disconnect OAuth provider
userRouter.delete("/me/providers/:provider", profileMutateLimiter, authMiddleware, disconnectProvider)

// Delete own account — password + confirm phrase required
userRouter.delete("/me/account", deleteAccountLimiter, authMiddleware, validateRequest(deleteAccountSchema, "body"), deleteAccount)

// Get user by id (public)
userRouter.get("/:id", getUser)

// Admin: delete any user
userRouter.delete("/admin/:id", authMiddleware, isAdmin, deleteUser)

// User: delete own account (requires password confirmation)
userRouter.delete("/:id", authMiddleware, deleteMyUser)

// Admin: promote user to admin
userRouter.patch("/role/:id", authMiddleware, isAdmin, promoteToAdmin)

// User: update own profile
userRouter.patch("/:id", authMiddleware, updateUser)

export default userRouter
