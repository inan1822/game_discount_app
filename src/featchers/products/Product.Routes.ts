import { Router } from "express"
import { createProduct, getProduct, getAllProducts, getUsersProducts, deleteProduct, updateProduct, addRating, restoreProduct } from "./Product.controller.js"
import { authMiddleware } from "../../shared/middlewares/shared.middlewares.js"
import { productPremiision } from "../../shared/middlewares/shared.productPR.js"
import { uploadsingle } from "../../shared/middlewares/Upload.middleware.js"
import { isAdmin } from "../../shared/middlewares/shared.admin.js"
import { validateRequest } from "../../shared/middlewares/validateRequst.js"
import { createProductSchema, updateProductSchema, addRatingSchema, productIdParamsSchema, userIdParamsSchema, getAllProductsQuerySchema } from "../../shared/validators/products.schemas.js"

const productrout: Router = Router()


productrout.post("/", authMiddleware, isAdmin, uploadsingle, validateRequest(createProductSchema, "body"), createProduct)
productrout.get("/", validateRequest(getAllProductsQuerySchema, "query"), getAllProducts)
productrout.get("/user/:id", validateRequest(userIdParamsSchema, "params"), getUsersProducts)
productrout.get("/:id", validateRequest(productIdParamsSchema, "params"), getProduct)
productrout.delete("/:id", authMiddleware, isAdmin, productPremiision, validateRequest(productIdParamsSchema, "params"), deleteProduct)
productrout.put("/:id", authMiddleware, isAdmin, productPremiision, validateRequest(productIdParamsSchema, "params"), validateRequest(updateProductSchema, "body"), updateProduct)
productrout.post("/:id/rating", authMiddleware, validateRequest(productIdParamsSchema, "params"), validateRequest(addRatingSchema, "body"), addRating)
productrout.patch("/:id/restore", authMiddleware, isAdmin, validateRequest(productIdParamsSchema, "params"), restoreProduct)

export default productrout