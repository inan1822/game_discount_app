import { Router } from "express"
import { authMiddleware } from "../../shared/middlewares/shared.middlewares.js"
import {
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    checkWishlist,
    getFriendsWithGame,
} from "./wishlist.controller.js"

const wishlistRouter = Router()

// All wishlist routes require auth
wishlistRouter.use(authMiddleware)

// GET  /api/v1/wishlist          → get user's wishlist
wishlistRouter.get("/", getWishlist)

// POST /api/v1/wishlist          → add game to wishlist
wishlistRouter.post("/", addToWishlist)

// GET  /api/v1/wishlist/friends/:gameId → which of my following-friends have this game
// MUST be declared before /:gameId so "friends" is not treated as a gameId
wishlistRouter.get("/friends/:gameId", getFriendsWithGame)

// GET  /api/v1/wishlist/:gameId  → check if game is in wishlist
wishlistRouter.get("/:gameId", checkWishlist)

// DELETE /api/v1/wishlist/:gameId → remove from wishlist
wishlistRouter.delete("/:gameId", removeFromWishlist)

export default wishlistRouter
