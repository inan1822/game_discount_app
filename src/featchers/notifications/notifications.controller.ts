import { Request, Response } from "express"
import { getErrorInfo } from "../../shared/utils/AppError.js"
import {
    listNotificationsService,
    getUnreadCountService,
    markReadService,
    markAllReadService,
    deleteNotificationService,
    seedNotificationService,
} from "./notifications.service.js"

export const listNotifications = async (req: Request, res: Response) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 20, 50)
        const before = typeof req.query.before === "string" ? req.query.before : undefined
        const result = await listNotificationsService(req.user!.id, limit, before)
        res.status(200).json({ status: "200", message: "OK", data: result })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const getUnreadCount = async (req: Request, res: Response) => {
    try {
        const counts = await getUnreadCountService(req.user!.id)
        res.status(200).json({ status: "200", message: "OK", data: counts })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const markRead = async (req: Request, res: Response) => {
    try {
        await markReadService(req.user!.id, String(req.params.id))
        res.status(200).json({ status: "200", message: "Marked as read", data: null })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const markAllRead = async (req: Request, res: Response) => {
    try {
        await markAllReadService(req.user!.id)
        res.status(200).json({ status: "200", message: "All marked as read", data: null })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const deleteNotification = async (req: Request, res: Response) => {
    try {
        await deleteNotificationService(req.user!.id, String(req.params.id))
        res.status(200).json({ status: "200", message: "Notification deleted", data: null })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const seedNotification = async (req: Request, res: Response) => {
    try {
        const type = req.body.type === "event" ? "event" : "discount"
        const notif = await seedNotificationService(req.user!.id, type)
        res.status(201).json({ status: "201", message: "Seeded", data: notif })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}
