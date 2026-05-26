import { Router } from "express"
import { authMiddleware } from "../../shared/middlewares/shared.middlewares.js"
import { isAdmin } from "../../shared/middlewares/shared.admin.js"
import {
  listProducts, createProduct, getProduct, updateProduct, deleteProduct,
  listKeys, importKeys,
} from "./product.controller.js"

const productRouter: Router = Router()

productRouter.use(authMiddleware, isAdmin)

// ── Products ────────────────────────────────────────────────────────────────
productRouter.get("/",     listProducts)
productRouter.post("/",    createProduct)
productRouter.get("/:id",  getProduct)
productRouter.put("/:id",  updateProduct)
productRouter.delete("/:id", deleteProduct)

// ── Keys (nested under product) ─────────────────────────────────────────────
productRouter.get( "/:id/keys", listKeys)
productRouter.post("/:id/keys", importKeys)

export default productRouter
