import { register, login, verifyEmail, resendVerification, verifyTwoFactor, requestPasswordReset, resetPassword, getMe, logout } from "./auth.controller.js"
import { discordRedirect, discordCallbackHandler, googleRedirect, googleCallbackHandler, steamRedirect, steamCallbackHandler } from "./oauth.controller.js"
import { Router } from "express"
import rateLimit from "express-rate-limit"
import { authMiddleware } from "../../shared/middlewares/shared.middlewares.js"
import { validateRequest } from "../../shared/middlewares/validateRequst.js"
import { registerSchema, loginSchema, verifyEmailSchema, verifyTwoFactorSchema, requestPasswordResetSchema, resetPasswordSchema } from "../../shared/validators/auth.schemas.js"

// Strict limiter — credential/token endpoints (login, 2FA, password reset)
const strictAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15-minute window
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: "429", message: "Too many attempts, please try again later", data: null }
})

// Registration limiter — prevents fake account spam + Gmail quota exhaustion
const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15-minute window
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: "429", message: "Too many attempts, please try again later", data: null }
})

const authRouter: Router = Router()

// ─── Email / password ─────────────────────────────────────────────────────────
authRouter.post("/register", registerLimiter, validateRequest(registerSchema, "body"), register)
authRouter.post("/verify", strictAuthLimiter, validateRequest(verifyEmailSchema, "body"), verifyEmail)
authRouter.post("/resend-verify", strictAuthLimiter, validateRequest(requestPasswordResetSchema, "body"), resendVerification)
authRouter.post("/login", strictAuthLimiter, validateRequest(loginSchema, "body"), login)
authRouter.post("/admin", strictAuthLimiter, validateRequest(verifyTwoFactorSchema, "body"), verifyTwoFactor)
authRouter.post("/request-password-reset", strictAuthLimiter, validateRequest(requestPasswordResetSchema, "body"), requestPasswordReset)
authRouter.post("/reset-password", strictAuthLimiter, validateRequest(resetPasswordSchema, "body"), resetPassword)
authRouter.post("/logout", authMiddleware, logout)
authRouter.get("/me", authMiddleware, getMe)

// ─── Google OAuth2 ────────────────────────────────────────────────────────────
authRouter.get("/google", googleRedirect)
authRouter.get("/google/callback", googleCallbackHandler)

// ─── Discord OAuth2 ───────────────────────────────────────────────────────────
authRouter.get("/discord", discordRedirect)
authRouter.get("/discord/callback", discordCallbackHandler)

// ─── Steam OpenID ─────────────────────────────────────────────────────────────
authRouter.get("/steam", steamRedirect)
authRouter.get("/steam/callback", steamCallbackHandler)

export default authRouter