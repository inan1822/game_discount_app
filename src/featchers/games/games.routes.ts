import { Router } from "express"
import {
    searchGames,
    getGameById,
    getTrendingGames,
    getGamesByGenre
} from "./games.controller.js"

const gamesRouter = Router()

// GET /api/v1/games/search?q=elden+ring&page=1
gamesRouter.get("/search", searchGames)

// GET /api/v1/games/trending
gamesRouter.get("/trending", getTrendingGames)

// GET /api/v1/games/genre?genre=action&page=1
gamesRouter.get("/genre", getGamesByGenre)

// GET /api/v1/games/:id
gamesRouter.get("/:id", getGameById)

export default gamesRouter
