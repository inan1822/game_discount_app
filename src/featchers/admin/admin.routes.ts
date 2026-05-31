import { Router } from "express"
import { authMiddleware } from "../../shared/middlewares/shared.middlewares.js"
import { isAdmin } from "../../shared/middlewares/shared.admin.js"
import { getDashboardStats } from "./admin.controller.js"
import { listUsers, getUser, updateUser, deleteUser } from "./user-admin.controller.js"
import { getAnalytics } from "./analytics.controller.js"
import { broadcastNotification, broadcastHistory } from "./broadcast.controller.js"
import { listPromos, createPromo, updatePromo, deletePromo } from "../promos/promo.controller.js"
import {
  listManualLinks,
  createManualLink,
  updateManualLink,
  deleteManualLink,
} from "../games/manualLinks.controller.js"
import { adminLLMChat, analyzeLink } from "./llm.controller.js"
import {
  adminListTickets,
  adminGetTicket,
  adminUpdateTicket,
  adminAddMessage,
} from "../support/ticket.controller.js"

const adminRouter: Router = Router()

// Every route below requires a verified JWT and admin role.
adminRouter.use(authMiddleware, isAdmin)

adminRouter.get("/dashboard/stats", getDashboardStats)
adminRouter.get("/analytics",       getAnalytics)

// ── User management ──────────────────────────────────────────────────────────
adminRouter.get("/users",     listUsers)
adminRouter.get("/users/:id", getUser)
adminRouter.patch("/users/:id", updateUser)
adminRouter.delete("/users/:id", deleteUser)

// ── Promo codes ───────────────────────────────────────────────────────────────
adminRouter.get("/promos",      listPromos)
adminRouter.post("/promos",     createPromo)
adminRouter.patch("/promos/:id", updatePromo)
adminRouter.delete("/promos/:id", deletePromo)

// ── Broadcast ─────────────────────────────────────────────────────────────────
adminRouter.post("/broadcast",         broadcastNotification)
adminRouter.get("/broadcast/history",  broadcastHistory)

// ── Manual game links ─────────────────────────────────────────────────────────
adminRouter.get("/game-links",        listManualLinks)
adminRouter.post("/game-links",       createManualLink)
adminRouter.patch("/game-links/:id",  updateManualLink)
adminRouter.delete("/game-links/:id", deleteManualLink)

// ── AI Assistant (Claude-powered, streaming SSE) ──────────────────────────────
adminRouter.post("/llm/chat",         adminLLMChat)
adminRouter.post("/llm/analyze-link", analyzeLink)

// ── Support tickets ───────────────────────────────────────────────────────────
adminRouter.get("/tickets",                   adminListTickets)
adminRouter.get("/tickets/:id",               adminGetTicket)
adminRouter.patch("/tickets/:id",             adminUpdateTicket)
adminRouter.post("/tickets/:id/messages",     adminAddMessage)

export default adminRouter
