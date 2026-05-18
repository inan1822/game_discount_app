import { register, login, verifyEmail, resendVerification, verifyTwoFactor, requestPasswordReset, resetPassword, getMe, logout } from "./auth.controller.js"
import { discordRedirect, discordCallbackHandler, googleRedirect, googleCallbackHandler, steamRedirect, steamCallbackHandler } from "./oauth.controller.js"
import { Router } from "express"
import { authMiddleware } from "../../shared/middlewares/shared.middlewares.js"
import { validateRequest } from "../../shared/middlewares/validateRequst.js"
import { registerSchema, loginSchema, verifyEmailSchema, verifyTwoFactorSchema, requestPasswordResetSchema, resetPasswordSchema } from "../../shared/validators/auth.schemas.js"

const authRouter: Router = Router()

// ─── Email / password ─────────────────────────────────────────────────────────
authRouter.post("/register", validateRequest(registerSchema, "body"), register)
authRouter.post("/verify", validateRequest(verifyEmailSchema, "body"), verifyEmail)
authRouter.post("/resend-verify", validateRequest(requestPasswordResetSchema, "body"), resendVerification)
authRouter.post("/login", validateRequest(loginSchema, "body"), login)
authRouter.post("/admin", validateRequest(verifyTwoFactorSchema, "body"), verifyTwoFactor)
authRouter.post("/request-password-reset", validateRequest(requestPasswordResetSchema, "body"), requestPasswordReset)
authRouter.post("/reset-password", validateRequest(resetPasswordSchema, "body"), resetPassword)
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