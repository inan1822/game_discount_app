import { Router } from "express"
import { handleStripeWebhook } from "./webhook.controller.js"

const webhookRouter: Router = Router()

// Raw body is applied in server.ts before this router — do NOT add express.json() here.
webhookRouter.post("/stripe", handleStripeWebhook)

export default webhookRouter
