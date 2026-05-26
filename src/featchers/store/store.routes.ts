import { Router } from "express"
import { listStoreProducts, getStoreProduct, getProductsByGame } from "./store.controller.js"

const storeRouter: Router = Router()

storeRouter.get("/products",                        listStoreProducts)
storeRouter.get("/products/by-game/:rawgGameId",    getProductsByGame)
storeRouter.get("/products/:id",                    getStoreProduct)

export default storeRouter
