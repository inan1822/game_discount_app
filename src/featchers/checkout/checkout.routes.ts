import { Router } from "express"
import { authMiddleware } from "../../shared/middlewares/shared.middlewares.js"
import { createCheckout, getMyOrders, getOrderKey } from "./checkout.controller.js"
import { validatePromo } from "../promos/promo.controller.js"

const checkoutRouter: Router = Router()

// Both routes require the customer to be logged in.
checkoutRouter.post("/",                           authMiddleware, createCheckout)
checkoutRouter.get("/orders",                      authMiddleware, getMyOrders)
checkoutRouter.get("/orders/:orderId/key",         authMiddleware, getOrderKey)
checkoutRouter.post("/validate-promo",             authMiddleware, validatePromo)

export default checkoutRouter
