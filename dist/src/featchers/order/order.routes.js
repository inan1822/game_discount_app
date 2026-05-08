import express from "express";
import { authMiddleware } from "../../shared/middlewares/shared.middlewares.js";
import { isAdmin } from "../../shared/middlewares/shared.admin.js";
import { createOrder, getMyOrders, getOrderById, getAllOrders, updateOrderStatus, cancelOrder } from "./order.controller.js";
import { validateRequest } from "../../shared/middlewares/validateRequst.js";
import { createOrderSchema, updateOrderStatusSchema, orderIdParamsSchema, paginationQuerySchema } from "../../shared/validators/order.schemas.js";
const orderRouter = express.Router();
orderRouter.post("/", authMiddleware, validateRequest(createOrderSchema, "body"), createOrder);
orderRouter.get("/my-orders", authMiddleware, getMyOrders);
orderRouter.get("/", authMiddleware, isAdmin, validateRequest(paginationQuerySchema, "query"), getAllOrders);
orderRouter.get("/:id", authMiddleware, validateRequest(orderIdParamsSchema, "params"), getOrderById);
orderRouter.put("/:id/status", authMiddleware, isAdmin, validateRequest(orderIdParamsSchema, "params"), validateRequest(updateOrderStatusSchema, "body"), updateOrderStatus);
orderRouter.put("/:id/cancel", authMiddleware, validateRequest(orderIdParamsSchema, "params"), cancelOrder);
export default orderRouter;
//# sourceMappingURL=order.routes.js.map