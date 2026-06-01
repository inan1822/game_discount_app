import express from "express"
import authRouter from "./featchers/auth/auth.routes.js"
import userRouter from "./featchers/users/users.routes.js"
import gamesRouter from "./featchers/games/games.routes.js"
import wishlistRouter from "./featchers/wishlist/wishlist.routes.js"
import notificationsRouter from "./featchers/notifications/notifications.routes.js"
import supportRouter from "./featchers/support/support.routes.js"
import adminRouter from "./featchers/admin/admin.routes.js"
import orderRouter from "./featchers/orders/order.routes.js"
import productRouter from "./featchers/products/product.routes.js"
import storeRouter from "./featchers/store/store.routes.js"
import checkoutRouter from "./featchers/checkout/checkout.routes.js"
import chatRouter from "./featchers/chat/chat.routes.js"
import webhookRouter from "./featchers/webhooks/webhook.routes.js"
import rateLimit from "express-rate-limit"
import cors from "cors"
import helmet from "helmet"
import hpp from "hpp"
import errorHandler from "./shared/middlewares/errorHandler.js"
import morgan from "morgan"

const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
    ...(process.env.CRM_URL    ? [process.env.CRM_URL]    : []),
]

const app = express()

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }))
app.use(morgan(process.env.NODE_ENV === "test" ? "silent" : process.env.NODE_ENV === "production" ? "combined" : "dev"))

// Stripe webhook must be before express.json()
app.use("/api/v1/webhooks", express.raw({ type: "application/json" }), webhookRouter)

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) callback(null, true)
        else callback(new Error("Origin not allowed"))
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
}))

app.use(express.json({ limit: "10kb" }))
app.use(hpp({ checkQuery: true, checkBody: true }))
app.set("trust proxy", 1)

const authLimiter = rateLimit({
    windowMs: 60 * 1000, limit: 60,
    standardHeaders: true, legacyHeaders: false,
    message: { status: "429", message: "Too many requests, please slow down", data: null },
    skip: () => process.env.NODE_ENV === "test",  // disable rate limits in tests
})

const globalLimiter = rateLimit({
    windowMs: 60 * 1000, limit: 2000,
    standardHeaders: true, legacyHeaders: false,
    message: { status: "429", message: "Too many requests, please slow down", data: null },
    skip: () => process.env.NODE_ENV === "test",
})

app.use("/api/v1/auth",          authLimiter,   authRouter)
app.use("/api/v1/users",         globalLimiter, userRouter)
app.use("/api/v1/games",         globalLimiter, gamesRouter)
app.use("/api/v1/wishlist",      globalLimiter, wishlistRouter)
app.use("/api/v1/notifications", globalLimiter, notificationsRouter)
app.use("/api/v1/support",       globalLimiter, supportRouter)
app.use("/api/v1/admin",         globalLimiter, adminRouter)
app.use("/api/v1/admin/orders",  globalLimiter, orderRouter)
app.use("/api/v1/admin/products",globalLimiter, productRouter)
app.use("/api/v1/store",         globalLimiter, storeRouter)
app.use("/api/v1/checkout",      globalLimiter, checkoutRouter)
app.use("/api/v1/chat",          globalLimiter, chatRouter)

app.get("/", (_req, res) => {
    res.status(200).json({ status: "ok", message: "DisLow API is running" })
})

app.use((_req, res) => {
    res.status(404).json({ status: "404", message: "Route not found", data: null })
})

app.use(errorHandler)

export { app, allowedOrigins }
