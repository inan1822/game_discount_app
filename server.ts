import "dotenv/config"
import express from "express"
import http from "http"
import authRouter from "./src/featchers/auth/auth.routes.js"
import userRouter from "./src/featchers/users/users.routes.js"
import gamesRouter from "./src/featchers/games/games.routes.js"
import wishlistRouter from "./src/featchers/wishlist/wishlist.routes.js"
import notificationsRouter from "./src/featchers/notifications/notifications.routes.js"
import supportRouter from "./src/featchers/support/support.routes.js"
import adminRouter from "./src/featchers/admin/admin.routes.js"
import orderRouter from "./src/featchers/orders/order.routes.js"
import productRouter from "./src/featchers/products/product.routes.js"
import storeRouter from "./src/featchers/store/store.routes.js"
import checkoutRouter from "./src/featchers/checkout/checkout.routes.js"
import chatRouter from "./src/featchers/chat/chat.routes.js"
import webhookRouter from "./src/featchers/webhooks/webhook.routes.js"
import mongoConnect from "./src/config/db.js"
import { startKeyCleanupJob } from "./src/featchers/products/keyCleanup.js"
import { startNotifyCron } from "./src/jobs/notify.cron.js"
import rateLimit from "express-rate-limit"
import cors from "cors"
import helmet from "helmet"
import hpp from "hpp"
import errorHandler from "./src/shared/middlewares/errorHandler.js"
import morgan from "morgan"
import { initSocket } from "./src/shared/socket/io.js"

// ── Validate critical secrets at startup — fail fast before accepting traffic ──
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters long")
}
if (!process.env.RAWG_API) {
    console.warn("[Startup] RAWG_API key is not set — game data endpoints will fail")
}
if (!process.env.ITAD_API_KEY) {
    console.warn("[ITAD] ITAD_API_KEY not set — ITAD price path disabled")
}

const IS_PROD = process.env.NODE_ENV === "production"
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    const msg = "[Startup] EMAIL_USER / EMAIL_PASS must be set — transactional emails (receipts, key delivery) will fail silently otherwise"
    if (IS_PROD) throw new Error(msg)
    console.warn(msg)
}
if (!process.env.STRIPE_WEBHOOK_SECRET) {
    const msg = "[Startup] STRIPE_WEBHOOK_SECRET not set — paid-order key delivery is broken"
    if (IS_PROD) throw new Error(msg)
    console.warn(msg)
}
if (!process.env.STRIPE_SECRET_KEY) {
    const msg = "[Startup] STRIPE_SECRET_KEY not set — checkout is broken"
    if (IS_PROD) throw new Error(msg)
    console.warn(msg)
}

const app = express()

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
}))
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"))

// ── Stripe webhook — MUST be registered BEFORE express.json() ───────────────
// Stripe requires the raw body to verify the signature.
app.use("/api/v1/webhooks", express.raw({ type: "application/json" }), webhookRouter)

const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
]

app.use(cors({
    origin: function (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true)
        } else {
            callback(new Error("Origin not allowed"))
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
}))

app.use(express.json({ limit: "10kb" }))

app.use(hpp({
    checkQuery: true,
    checkBody: true
}))

app.set("trust proxy", 1)

// Generous limiter for the entire /auth prefix (passive routes like /me)
const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: "429", message: "Too many requests, please slow down", data: null }
})


const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 2000,          // per-IP — raised from 500: 2 tabs × 6 sections × infinite scroll
                          // easily exceeds 500 for a real user. 2000 still blocks bots.
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: "429",
        message: "Too many requests, please slow down",
        data: null
    }
})

app.use("/api/v1/auth", authLimiter, authRouter)
app.use("/api/v1/users", globalLimiter, userRouter)
app.use("/api/v1/games", globalLimiter, gamesRouter)
app.use("/api/v1/wishlist", globalLimiter, wishlistRouter)
app.use("/api/v1/notifications", globalLimiter, notificationsRouter)
app.use("/api/v1/support",       globalLimiter, supportRouter)
app.use("/api/v1/admin",          globalLimiter, adminRouter)
app.use("/api/v1/admin/orders",   globalLimiter, orderRouter)
app.use("/api/v1/admin/products", globalLimiter, productRouter)
app.use("/api/v1/store",          globalLimiter, storeRouter)
app.use("/api/v1/checkout",       globalLimiter, checkoutRouter)
app.use("/api/v1/chat",           globalLimiter, chatRouter)

app.get("/", (_req, res) => {
    res.status(200).json({ status: "ok", message: "DisLow API is running" })
})

app.use((_req, res) => {
    res.status(404).json({ status: "404", message: "Route not found", data: null })
})

app.use(errorHandler)

const Port = process.env.PORT || 5000

// Wrap Express in an HTTP server so socket.io can attach to the same port.
// Admin sockets authenticate via handshake.auth.token (see src/shared/socket/io.ts).
const httpServer = http.createServer(app)
initSocket(httpServer, allowedOrigins)

mongoConnect().then(() => {
    httpServer.listen(Port, () => {
        console.log(`DisLow API running on port ${Port}`)
    })
    // Release reserved keys whose checkouts crashed / were cancelled.
    startKeyCleanupJob()
    startNotifyCron()
}).catch(err => {
    console.error("Failed to connect to DB:", err)
    process.exit(1)
})
