import { Router } from "express"
import { authMiddleware } from "../../shared/middlewares/shared.middlewares.js"
import {
    searchGames,
    getGameById,
    getPopularGames,
    getNewGames,
    getTrendedGames,
    getForYou,
    getTrendingGames,
    getGamesByGenre,
    getGamePrice,
    getGameDeals,
    getGameDlcDeals,
    getFreeToPlay,
    getHiddenGems,
    getDealOfDay,
    getByGenre,
    batchPrices,
    cardPrices,
    getGameGiveaways,
    getGameEvents,
} from "./games.controller.js"
import { getManualLinksForGame } from "./manualLinks.controller.js"

const gamesRouter = Router()

// ── Search ────────────────────────────────────────────────────────────────────
// GET /api/v1/games/search?q=elden+ring&page=1
gamesRouter.get("/search", searchGames)

// ── Home sections ─────────────────────────────────────────────────────────────
// GET /api/v1/games/popular    → biggest communities, no DLC
gamesRouter.get("/popular", getPopularGames)

// GET /api/v1/games/new        → released in last 12 months, no DLC
gamesRouter.get("/new", getNewGames)

// GET /api/v1/games/trended    → last 3 years sorted by community traction, no DLC
gamesRouter.get("/trended", getTrendedGames)

// GET /api/v1/games/for-you    → personalised (auth required), no DLC
gamesRouter.get("/for-you", authMiddleware, getForYou)

// GET /api/v1/games/price?title=TITLE  → cheapest single price (home cards)
gamesRouter.get("/price", getGamePrice)

// POST /api/v1/games/batch-prices  → body: { titles: string[] } → { [title]: price | null }
gamesRouter.post("/batch-prices", authMiddleware, batchPrices)

// POST /api/v1/games/card-prices → body: { games: [{id,name,steamAppId?}] } → { [id]: CardPrice | null }
gamesRouter.post("/card-prices", cardPrices)

// GET /api/v1/games/deals?title=TITLE  → all store deals (game detail page)
gamesRouter.get("/deals", getGameDeals)

// GET /api/v1/games/dlc-deals?steamAppId=APPID → DLC-only store discounts
gamesRouter.get("/dlc-deals", getGameDlcDeals)

// GET /api/v1/games/free-to-play
gamesRouter.get("/free-to-play", getFreeToPlay)

// GET /api/v1/games/hidden-gems
gamesRouter.get("/hidden-gems", getHiddenGems)

// GET /api/v1/games/deal-of-day
gamesRouter.get("/deal-of-day", getDealOfDay)

// GET /api/v1/games/by-genre?genre=action&page=1
gamesRouter.get("/by-genre", getByGenre)

// GET /api/v1/games/giveaways?title=TITLE → GamerPower free giveaways matching the game
gamesRouter.get("/giveaways", getGameGiveaways)

// GET /api/v1/games/events?steamAppId=570 → Steam news/events feed for the game
gamesRouter.get("/events", getGameEvents)

// ── Legacy ────────────────────────────────────────────────────────────────────
// GET /api/v1/games/trending
gamesRouter.get("/trending", getTrendingGames)

// GET /api/v1/games/genre?genre=action&page=1
gamesRouter.get("/genre", getGamesByGenre)

// ── Manual links (public) ─────────────────────────────────────────────────────
// GET /api/v1/games/:rawgId/manual-links → admin-curated store/website links
gamesRouter.get("/:rawgId/manual-links", getManualLinksForGame)

// ── Detail (must be last to avoid catching /popular etc.) ────────────────────
// GET /api/v1/games/:id
gamesRouter.get("/:id", getGameById)

export default gamesRouter
