import { Router } from "express"
import { listStoreProducts, getStoreProduct, getProductsByGame, listFeatured } from "./store.controller.js"

const storeRouter: Router = Router()

storeRouter.get("/featured",                        listFeatured)
storeRouter.get("/products",                        listStoreProducts)
storeRouter.get("/products/by-game/:rawgGameId",    getProductsByGame)
storeRouter.get("/products/:id",                    getStoreProduct)

export default storeRouter
