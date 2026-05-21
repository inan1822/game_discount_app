import { Router } from "express"
import { authMiddleware } from "../../shared/middlewares/shared.middlewares.js"
import {
    listNotifications,
    getUnreadCount,
    markRead,
    markAllRead,
    deleteNotification,
    seedNotification,
} from "./notifications.controller.js"

const notificationsRouter: Router = Router()

// All routes require authentication
notificationsRouter.use(authMiddleware)

notificationsRouter.get("/",              listNotifications)
notificationsRouter.get("/unread-count",  getUnreadCount)
notificationsRouter.patch("/read-all",    markAllRead)
notificationsRouter.patch("/:id/read",    markRead)
notificationsRouter.delete("/:id",       deleteNotification)

// DEV-only seed endpoint — creates a sample notification for the logged-in user
if (process.env.NODE_ENV !== "production") {
    notificationsRouter.post("/dev/seed", seedNotification)
}

export default notificationsRouter
