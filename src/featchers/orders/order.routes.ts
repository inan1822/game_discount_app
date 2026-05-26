import { Router } from "express"
import { authMiddleware } from "../../shared/middlewares/shared.middlewares.js"
import { isAdmin } from "../../shared/middlewares/shared.admin.js"
import { listOrders, getOrder, updateOrderStatus, exportOrders, resendDeliveryEmail } from "./order.controller.js"

const orderRouter: Router = Router()

// All order-management routes require a verified admin JWT.
orderRouter.use(authMiddleware, isAdmin)

// Export must be registered BEFORE /:id so "export" isn't treated as an id param.
orderRouter.get("/export", exportOrders)
orderRouter.get("/",       listOrders)
orderRouter.get("/:id",    getOrder)
orderRouter.patch("/:id",  updateOrderStatus)
orderRouter.post("/:id/resend-email", resendDeliveryEmail)

export default orderRouter
