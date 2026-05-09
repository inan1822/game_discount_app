import express from "express"
import authRouter from "./src/featchers/auth/auth.routes.js"
import userRouter from "./src/featchers/users/users.routes.js"
import gamesRouter from "./src/featchers/games/games.routes.js"
import wishlistRouter from "./src/featchers/wishlist/wishlist.routes.js"
import mongoConnect from "./src/config/db.js"
import dotenv from "dotenv"
import rateLimit from "express-rate-limit"
import cors from "cors"
import helmet from "helmet"
import hpp from "hpp"
import errorHandler from "./src/shared/middlewares/errorHandler.js"
import morgan from "morgan"

dotenv.config()

const app = express()

app.use(helmet())
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"))

const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001"
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

app.use(express.json())

app.use(hpp({
    checkQuery: true,
    checkBody: true
}))

app.set("trust proxy", 1)

const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: "429",
        message: "Too many attempts, please try again after a minute",
        data: null
    }
})

const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
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

app.get("/", (_req, res) => {
    res.status(200).json({ status: "ok", message: "DisLow API is running" })
})

app.use(errorHandler)

const Port = process.env.PORT || 5000

mongoConnect().then(() => {
    app.listen(Port, () => {
        console.log(`DisLow API running on port ${Port}`)
    })
}).catch(err => {
    console.log("Failed to connect to DB:", err)
})
