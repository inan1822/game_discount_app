import "dotenv/config"
import http from "http"
import mongoConnect from "./src/config/db.js"
import { startKeyCleanupJob } from "./src/featchers/products/keyCleanup.js"
import { startNotifyCron } from "./src/jobs/notify.cron.js"
import { startStockMonitor } from "./src/jobs/stockMonitor.js"
import { startHealthPinger } from "./src/jobs/healthPinger.js"
import { initSocket } from "./src/shared/socket/io.js"
import { app, allowedOrigins } from "./src/app.js"

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
    const msg = "[Startup] EMAIL_USER / EMAIL_PASS must be set — transactional emails will fail silently"
    if (IS_PROD) throw new Error(msg)
    console.warn(msg)
}
if (!process.env.STRIPE_WEBHOOK_SECRET) {
    const msg = "[Startup] STRIPE_WEBHOOK_SECRET not set — paid-order key delivery is broken"
    if (IS_PROD) throw new Error(msg)
    console.warn(msg)
}
if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[Startup] ANTHROPIC_API_KEY not set — Admin AI assistant will be disabled")
}
if (!process.env.STRIPE_SECRET_KEY) {
    const msg = "[Startup] STRIPE_SECRET_KEY not set — checkout is broken"
    if (IS_PROD) throw new Error(msg)
    console.warn(msg)
}

const Port = process.env.PORT || 5000
const httpServer = http.createServer(app)
initSocket(httpServer, allowedOrigins)

mongoConnect().then(() => {
    httpServer.listen(Port, () => {
        console.log(`DisLow API running on port ${Port}`)
    })
    startKeyCleanupJob()
    startNotifyCron()
    startStockMonitor()
    startHealthPinger()
}).catch(err => {
    console.error("Failed to connect to DB:", err)
    process.exit(1)
})
