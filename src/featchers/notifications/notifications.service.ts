import NotificationModel, { INotification } from "./Notification.model.js"
import { AppError } from "../../shared/utils/AppError.js"

export interface NotificationPage {
    items: INotification[]
    hasMore: boolean
}

export interface UnreadByType {
    events: number
    discounts: number
    total: number
}

export const listNotificationsService = async (
    userId: string,
    limit = 20,
    before?: string,
): Promise<NotificationPage> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = { userId }
    if (before) query.createdAt = { $lt: new Date(before) }

    const items = await NotificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .lean()

    const hasMore = items.length > limit
    return { items: hasMore ? items.slice(0, limit) : items, hasMore }
}

export const getUnreadCountService = async (userId: string): Promise<UnreadByType> => {
    const [events, discounts] = await Promise.all([
        NotificationModel.countDocuments({ userId, type: "event", read: false }),
        NotificationModel.countDocuments({ userId, type: "discount", read: false }),
    ])
    return { events, discounts, total: events + discounts }
}

export const markReadService = async (userId: string, notifId: string): Promise<void> => {
    const result = await NotificationModel.updateOne(
        { _id: notifId, userId },
        { $set: { read: true } },
    )
    if (result.matchedCount === 0) throw new AppError("Notification not found", 404)
}

export const markAllReadService = async (userId: string): Promise<void> => {
    await NotificationModel.updateMany({ userId, read: false }, { $set: { read: true } })
}

export const deleteNotificationService = async (userId: string, notifId: string): Promise<void> => {
    const result = await NotificationModel.deleteOne({ _id: notifId, userId })
    if (result.deletedCount === 0) throw new AppError("Notification not found", 404)
}

export const seedNotificationService = async (
    userId: string,
    type: "event" | "discount" = "discount",
): Promise<INotification> => {
    const sample = type === "discount"
        ? { title: "Cyberpunk 2077 is 50% off", body: "Now $29.99 on Steam — lowest ever!", gameId: 41494, gameSlug: "cyberpunk-2077", link: null }
        : { title: "Double XP Weekend in Warzone", body: "Earn double XP until Sunday midnight.", gameId: 356190, gameSlug: "call-of-duty-warzone", link: null }

    return NotificationModel.create({ userId, type, read: false, ...sample })
}
