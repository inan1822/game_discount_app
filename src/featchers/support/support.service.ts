import FeedbackModel from "./Feedback.model.js"
import BugModel from "./Bug.model.js"
import userModel from "../users/User.model.js"
import WishlistModel from "../wishlist/Wishlist.model.js"
import NotificationModel from "../notifications/Notification.model.js"
import { AppError } from "../../shared/utils/AppError.js"

export const submitFeedbackService = async (
    userId: string | null,
    { text, email }: { text: string; email?: string },
) => {
    return FeedbackModel.create({ userId, text, email: email ?? null })
}

export const submitBugService = async (
    userId: string | null,
    { steps, expected, device, email }: { steps: string; expected: string; device: string; email?: string },
) => {
    return BugModel.create({ userId, steps, expected, device, email: email ?? null })
}

export const exportUserDataService = async (userId: string) => {
    const [user, wishlist, notifications] = await Promise.all([
        userModel.findById(userId)
            .select("name email avatar role isVerified notificationPrefs createdAt")
            .lean(),
        WishlistModel.find({ userId }).lean(),
        NotificationModel.find({ userId }).lean(),
    ])

    if (!user) throw new AppError("User not found", 404)

    return {
        exportedAt: new Date().toISOString(),
        profile: user,
        wishlist,
        notifications,
    }
}
