import express from "express"
import { authMiddleware } from "../../shared/middlewares/shared.middlewares.js"
import { validateRequest } from "../../shared/middlewares/validateRequst.js"
import { addToCartSchema, updateCartItemSchema, syncCartSchema, productIdParamsSchema } from "../../shared/validators/cart.schemas.js"
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart, syncCart } from "./cart.controller.js"
import { Router } from "express"
const router: Router = express.Router()

router.get("/", authMiddleware, getCart)
router.post("/sync", authMiddleware, validateRequest(syncCartSchema, "body"), syncCart)
router.post("/", authMiddleware, validateRequest(addToCartSchema, "body"), addToCart)
router.put("/:productId", authMiddleware, validateRequest(productIdParamsSchema, "params"), validateRequest(updateCartItemSchema, "body"), updateCartItem)
router.delete("/", authMiddleware, clearCart)
router.delete("/:productId", authMiddleware, validateRequest(productIdParamsSchema, "params"), removeFromCart)


export default router