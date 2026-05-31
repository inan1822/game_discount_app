import { Router } from "express"
import rateLimit from "express-rate-limit"
import joi from "joi"
import { authMiddleware } from "../../shared/middlewares/shared.middlewares.js"
import { validateRequest } from "../../shared/middlewares/validateRequst.js"
import {
  getConversations,
  openConversation,
  getConversationMessages,
  postMessage,
  postRead,
} from "./chat.controller.js"

// Coarse per-IP defense-in-depth. The real 3/day product limit is enforced
// server-side in chat.service for non-mutual recipients.
const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit:    60,                 // 60 messages/min/IP — generous for real chat, blocks floods
  standardHeaders: true,
  legacyHeaders:   false,
  message: { status: "429", message: "Slow down — too many messages.", data: null },
})

const sendSchema = joi.object({
  body:         joi.string().trim().min(1).max(2000).required(),
  clientTempId: joi.string().max(64).optional(),
}).options({ stripUnknown: true })

const chatRouter: Router = Router()

chatRouter.use(authMiddleware)

chatRouter.get("/conversations",                       getConversations)
chatRouter.post("/conversations/:withUserId",          openConversation)
chatRouter.get("/conversations/:id/messages",          getConversationMessages)
chatRouter.post("/conversations/:withUserId/messages", sendLimiter, validateRequest(sendSchema, "body"), postMessage)
chatRouter.post("/conversations/:id/read",             postRead)

export default chatRouter
