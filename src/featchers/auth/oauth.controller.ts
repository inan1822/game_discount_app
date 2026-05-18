import { Request, Response } from "express"
import { discordOAuthUrl, discordCallback, googleOAuthUrl, googleCallback, steamOAuthUrl, steamCallback } from "./oauth.service.js"
import { getErrorInfo } from "../../shared/utils/AppError.js"

const FRONTEND = process.env.FRONTEND_URL ?? "http://localhost:3000"

// ─── Discord ──────────────────────────────────────────────────────────────────

/** GET /api/v1/auth/discord — redirects browser to Discord login page */
export const discordRedirect = (_req: Request, res: Response) => {
    res.redirect(discordOAuthUrl())
}

/** GET /api/v1/auth/discord/callback — Discord redirects here after user approves */
export const discordCallbackHandler = async (req: Request, res: Response) => {
    try {
        const code = req.query.code as string
        if (!code) {
            return res.redirect(`${FRONTEND}/login?error=discord_denied`)
        }
        const token = await discordCallback(code)
        res.redirect(`${FRONTEND}/auth/callback?token=${token}`)
    } catch (error) {
        const { message } = getErrorInfo(error)
        console.error("Discord callback error:", message)
        res.redirect(`${FRONTEND}/login?error=discord_failed`)
    }
}

// ─── Google ───────────────────────────────────────────────────────────────────

/** GET /api/v1/auth/google — redirects browser to Google login page */
export const googleRedirect = (_req: Request, res: Response) => {
    res.redirect(googleOAuthUrl())
}

/** GET /api/v1/auth/google/callback — Google redirects here after user approves */
export const googleCallbackHandler = async (req: Request, res: Response) => {
    try {
        const code = req.query.code as string
        if (!code) {
            return res.redirect(`${FRONTEND}/login?error=google_denied`)
        }
        const token = await googleCallback(code)
        res.redirect(`${FRONTEND}/auth/callback?token=${token}`)
    } catch (error) {
        const { message } = getErrorInfo(error)
        console.error("Google callback error:", message)
        res.redirect(`${FRONTEND}/login?error=google_failed`)
    }
}

// ─── Steam ────────────────────────────────────────────────────────────────────

/** GET /api/v1/auth/steam — redirects browser to Steam OpenID login */
export const steamRedirect = (_req: Request, res: Response) => {
    res.redirect(steamOAuthUrl())
}

/** GET /api/v1/auth/steam/callback — Steam redirects here after login */
export const steamCallbackHandler = async (req: Request, res: Response) => {
    try {
        const query = req.query as Record<string, string>
        if (!query["openid.claimed_id"]) {
            return res.redirect(`${FRONTEND}/login?error=steam_denied`)
        }
        const token = await steamCallback(query)
        res.redirect(`${FRONTEND}/auth/callback?token=${token}`)
    } catch (error) {
        const { message } = getErrorInfo(error)
        console.error("Steam callback error:", message)
        res.redirect(`${FRONTEND}/login?error=steam_failed`)
    }
}
