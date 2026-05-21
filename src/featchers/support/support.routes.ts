import { Router } from "express"
import rateLimit from "express-rate-limit"
import { authMiddleware } from "../../shared/middlewares/shared.middlewares.js"
import { validateRequest } from "../../shared/middlewares/validateRequst.js"
import { submitFeedback, submitBug, exportUserData } from "./support.controller.js"
import joi from "joi"

// 3 submissions per hour per IP for feedback / bug reports
const supportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: "429", message: "Too many submissions. Please wait before trying again.", data: null },
})

// 1 export per 24 hours per IP
const exportLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    limit: 1,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: "429", message: "Data export is limited to once per day.", data: null },
})

const feedbackSchema = joi.object({
    text:  joi.string().min(10).max(5000).required(),
    email: joi.string().email().optional(),
}).options({ stripUnknown: true })

const bugSchema = joi.object({
    steps:    joi.string().min(10).max(5000).required(),
    expected: joi.string().min(5).max(2000).required(),
    device:   joi.string().min(2).max(300).required(),
    email:    joi.string().email().optional(),
}).options({ stripUnknown: true })

const supportRouter: Router = Router()

// Auth is optional on feedback/bug — guests can submit too
supportRouter.post("/feedback", supportLimiter, validateRequest(feedbackSchema, "body"), submitFeedback)
supportRouter.post("/bug",      supportLimiter, validateRequest(bugSchema, "body"),      submitBug)

// Export requires auth + strict per-day rate limit
supportRouter.get("/export", exportLimiter, authMiddleware, exportUserData)

export default supportRouter
