import sharp from "sharp"
import bcrypt from "bcrypt"
import crypto from "crypto"
import cloudinary from "../../config/cloudinary.js"
import userModel from "./User.model.js"
import WishlistModel from "../wishlist/Wishlist.model.js"
import NotificationModel from "../notifications/Notification.model.js"
import FeedbackModel from "../support/Feedback.model.js"
import BugModel from "../support/Bug.model.js"
import { AppError } from "../../shared/utils/AppError.js"
import { sendVerificationEmail } from "../../shared/utils/mailer.js"

// Dummy hash used to keep response time constant even when user not found
// or when a user has no real password (OAuth-only accounts get a random password).
const DUMMY_HASH = "$2b$12$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

function hashCode(code: string): string {
    return crypto.createHash("sha256").update(code).digest("hex")
}

function generateCode(): string {
    return crypto.randomInt(100000, 1000000).toString()
}

// ─── Edit profile ─────────────────────────────────────────────────────────────

export const editProfileService = async (
    userId: string,
    { name, email, currentPassword }: { name?: string; email?: string; currentPassword: string },
) => {
    const user = await userModel
        .findById(userId)
        .select("+password +pendingEmail +pendingEmailCode +pendingEmailExpiry")

    if (!user) throw new AppError("User not found", 404)

    // Always run bcrypt.compare — prevents timing attack revealing account existence.
    // For OAuth-only accounts (placeholder email), user.password is a random bcrypt hash.
    const isCorrect = await bcrypt.compare(currentPassword, user.password || DUMMY_HASH)
    if (!isCorrect) throw new AppError("Incorrect current password", 401)

    if (name) user.name = name

    let emailChangePending = false
    if (email && email !== user.email) {
        // Check the new email isn't already taken
        const existing = await userModel.findOne({ email })
        if (existing) throw new AppError("Email already in use", 409)

        // Stage the change — send verification to the NEW address
        const code = generateCode()
        user.pendingEmail      = email
        user.pendingEmailCode  = hashCode(code)
        user.pendingEmailExpiry = new Date(Date.now() + 15 * 60 * 1000)
        await user.save()
        await sendVerificationEmail(email, code)
        emailChangePending = true
        return { user: user.toObject(), emailChangePending }
    }

    await user.save()
    return { user: user.toObject(), emailChangePending }
}

// ─── Confirm pending email ─────────────────────────────────────────────────────

export const confirmPendingEmailService = async (userId: string, code: string) => {
    const user = await userModel
        .findById(userId)
        .select("+pendingEmail +pendingEmailCode +pendingEmailExpiry")

    if (!user) throw new AppError("User not found", 404)
    if (!user.pendingEmail || !user.pendingEmailCode) {
        throw new AppError("No pending email change", 400)
    }
    if (!user.pendingEmailExpiry || user.pendingEmailExpiry < new Date()) {
        throw new AppError("Verification code expired", 400)
    }
    if (hashCode(code) !== user.pendingEmailCode) {
        throw new AppError("Invalid verification code", 400)
    }

    user.email              = user.pendingEmail
    user.pendingEmail       = undefined
    user.pendingEmailCode   = undefined
    user.pendingEmailExpiry = undefined
    await user.save()
    return user
}

// ─── Change password ──────────────────────────────────────────────────────────

export const changePasswordService = async (
    userId: string,
    { currentPassword, newPassword }: { currentPassword: string; newPassword: string },
) => {
    const user = await userModel.findById(userId).select("+password")
    if (!user) throw new AppError("User not found", 404)

    const isCorrect = await bcrypt.compare(currentPassword, user.password || DUMMY_HASH)
    if (!isCorrect) throw new AppError("Incorrect current password", 401)

    user.password = newPassword  // Mongoose pre-save hook hashes this
    user.token    = null          // Invalidate all existing sessions
    await user.save()
}

// ─── Disconnect OAuth provider ────────────────────────────────────────────────

type Provider = "google" | "discord" | "steam"

export const disconnectProviderService = async (userId: string, provider: Provider) => {
    const user = await userModel.findById(userId)
    if (!user) throw new AppError("User not found", 404)

    const providerField = `${provider}Id` as "googleId" | "discordId" | "steamId"
    if (!user[providerField]) {
        throw new AppError(`${provider} is not connected`, 400)
    }

    // Safety: ensure the user can still log in after disconnect.
    // OAuth-only accounts use placeholder emails — they have no real password.
    const isOAuthOnly = user.email.endsWith("@placeholder.dislow")
    const otherProviders: (keyof typeof user)[] = (["googleId", "discordId", "steamId"] as const)
        .filter(p => p !== providerField)
    const hasOtherProvider = otherProviders.some(p => !!user[p])

    if (isOAuthOnly && !hasOtherProvider) {
        throw new AppError(
            "Cannot disconnect: this is your only login method. Connect another account first.",
            400,
        )
    }

    user[providerField] = undefined
    await user.save()
}

// ─── Delete account ───────────────────────────────────────────────────────────

export const deleteAccountService = async (
    userId: string,
    { password, confirmPhrase }: { password: string; confirmPhrase: string },
) => {
    if (confirmPhrase !== "Dont Delete Me :(") {
        throw new AppError("Confirmation phrase does not match", 400)
    }

    const user = await userModel.findById(userId).select("+password")
    if (!user) throw new AppError("User not found", 404)

    const isCorrect = await bcrypt.compare(password, user.password || DUMMY_HASH)
    if (!isCorrect) throw new AppError("Incorrect password", 401)

    await Promise.all([
        userModel.deleteOne({ _id: userId }),
        WishlistModel.deleteMany({ userId }),
        NotificationModel.deleteMany({ userId }),
        // Anonymize feedback/bug reports — keep content, remove personal link
        FeedbackModel.updateMany({ userId }, { $set: { userId: null } }),
        BugModel.updateMany({ userId }, { $set: { userId: null } }),
    ])
}

// ─── Preset gallery ───────────────────────────────────────────────────────────
// Paths are relative to the Next.js `public/` folder — the frontend serves them.
// Stored as paths so the backend stays decoupled from the client's origin URL.
const PRESET_PATHS = Array.from({ length: 12 }, (_, i) =>
    `/avatars/avatar-${String(i + 1).padStart(2, "0")}.svg`,
)

const PRESET_SET = new Set(PRESET_PATHS)

export const getAvatarGalleryService = () => PRESET_PATHS

// ─── Update avatar ────────────────────────────────────────────────────────────

interface UpdateAvatarOptions {
    presetPath?: string
    file?: Express.Multer.File
}

export const updateAvatarService = async (
    userId: string,
    { presetPath, file }: UpdateAvatarOptions,
): Promise<string> => {
    let avatarUrl: string

    if (presetPath) {
        // Validate against allowlist — prevent arbitrary URLs being stored
        if (!PRESET_SET.has(presetPath)) {
            throw new AppError("Invalid preset path", 400)
        }
        avatarUrl = presetPath
    } else if (file) {
        // 1. Re-decode + resize 256×256 + strip EXIF via sharp
        //    This catches fake images (e.g. a ZIP renamed to .png).
        let processedBuffer: Buffer
        try {
            processedBuffer = await sharp(file.buffer)
                .resize(256, 256, { fit: "cover" })
                .png()            // normalise to PNG — strips all EXIF
                .toBuffer()
        } catch {
            throw new AppError("File is not a valid image", 422)
        }

        // 2. Upload to Cloudinary from buffer
        avatarUrl = await new Promise<string>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: "dislow/avatars",
                    resource_type: "image",
                    transformation: [{ width: 256, height: 256, crop: "fill" }],
                },
                (err, result) => {
                    if (err || !result?.secure_url) {
                        reject(new AppError("Failed to upload avatar", 500))
                    } else {
                        resolve(result.secure_url)
                    }
                },
            )
            stream.end(processedBuffer)
        })
    } else {
        throw new AppError("No avatar source provided", 400)
    }

    await userModel.findByIdAndUpdate(userId, { avatar: avatarUrl })
    return avatarUrl
}
