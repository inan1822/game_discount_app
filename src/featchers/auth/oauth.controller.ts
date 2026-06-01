import { Request, Response } from "express"
import crypto from "crypto"
import { discordOAuthUrl, discordCallback, googleOAuthUrl, googleCallback, steamOAuthUrl, steamCallback } from "./oauth.service.js"
import { getErrorInfo } from "../../shared/utils/AppError.js"

const FRONTEND = process.env.FRONTEND_URL ?? "http://localhost:3000"

function setAuthCookie(res: Response, token: string): void {
    res.cookie("dislow_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 2 * 60 * 60 * 1000,
    })
}

// ─── OAuth CSRF state ────────────────────────────────────────────────────────
// Bind a request's outbound OAuth redirect to its inbound callback via a
// short-lived httpOnly cookie. Without this, an attacker can forge a callback
// URL that links their social account into a victim's session.
const STATE_COOKIE = "dislow_oauth_state"
const STATE_TTL_MS = 10 * 60 * 1000

function issueStateCookie(res: Response): string {
    const state = crypto.randomBytes(24).toString("hex")
    res.cookie(STATE_COOKIE, state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: STATE_TTL_MS,
    })
    return state
}

function clearStateCookie(res: Response): void {
    res.clearCookie(STATE_COOKIE, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
    })
}

/** Parse the state cookie out of the raw Cookie header. */
function readStateCookie(req: Request): string | undefined {
    const header = req.headers.cookie
    if (!header) return undefined
    const pair = header.split(";").map(c => c.trim()).find(c => c.startsWith(`${STATE_COOKIE}=`))
    if (!pair) return undefined
    return decodeURIComponent(pair.split("=").slice(1).join("="))
}

/** Constant-time compare of the cookie state against the param state. */
function verifyState(cookieState: string | undefined, paramState: unknown): boolean {
    if (!cookieState || typeof paramState !== "string" || !paramState) return false
    const a = Buffer.from(cookieState)
    const b = Buffer.from(paramState)
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
}

// ─── Discord ──────────────────────────────────────────────────────────────────

/** GET /api/v1/auth/discord — redirects browser to Discord login page */
export const discordRedirect = (_req: Request, res: Response) => {
    const state = issueStateCookie(res)
    res.redirect(discordOAuthUrl(state))
}

/** GET /api/v1/auth/discord/callback — Discord redirects here after user approves */
export const discordCallbackHandler = async (req: Request, res: Response) => {
    try {
        const code = req.query.code as string
        if (!code) {
            clearStateCookie(res)
            return res.redirect(`${FRONTEND}/login?error=discord_denied`)
        }
        if (!verifyState(readStateCookie(req), req.query.state)) {
            clearStateCookie(res)
            return res.redirect(`${FRONTEND}/login?error=discord_csrf`)
        }
        clearStateCookie(res)
        const token = await discordCallback(code)
        setAuthCookie(res, token)
        res.redirect(`${FRONTEND}/auth/callback`)
    } catch (error) {
        const { message } = getErrorInfo(error)
        console.error("Discord callback error:", message)
        res.redirect(`${FRONTEND}/login?error=discord_failed`)
    }
}

// ─── Google ───────────────────────────────────────────────────────────────────

/** GET /api/v1/auth/google — redirects browser to Google login page */
export const googleRedirect = (_req: Request, res: Response) => {
    const state = issueStateCookie(res)
    res.redirect(googleOAuthUrl(state))
}

/** GET /api/v1/auth/google/callback — Google redirects here after user approves */
export const googleCallbackHandler = async (req: Request, res: Response) => {
    try {
        const code = req.query.code as string
        if (!code) {
            clearStateCookie(res)
            return res.redirect(`${FRONTEND}/login?error=google_denied`)
        }
        if (!verifyState(readStateCookie(req), req.query.state)) {
            clearStateCookie(res)
            return res.redirect(`${FRONTEND}/login?error=google_csrf`)
        }
        clearStateCookie(res)
        const token = await googleCallback(code)
        setAuthCookie(res, token)
        res.redirect(`${FRONTEND}/auth/callback`)
    } catch (error) {
        const { message } = getErrorInfo(error)
        console.error("Google callback error:", message)
        res.redirect(`${FRONTEND}/login?error=google_failed`)
    }
}

// ─── Steam ────────────────────────────────────────────────────────────────────

/** GET /api/v1/auth/steam — redirects browser to Steam OpenID login */
export const steamRedirect = (_req: Request, res: Response) => {
    const state = issueStateCookie(res)
    res.redirect(steamOAuthUrl(state))
}

/** GET /api/v1/auth/steam/callback — Steam redirects here after login */
export const steamCallbackHandler = async (req: Request, res: Response) => {
    try {
        const query = req.query as Record<string, string>
        if (!query["openid.claimed_id"]) {
            clearStateCookie(res)
            return res.redirect(`${FRONTEND}/login?error=steam_denied`)
        }
        // State arrives as a regular query param because we embedded it on the
        // openid.return_to URL Steam echoes back.
        if (!verifyState(readStateCookie(req), query.state)) {
            clearStateCookie(res)
            return res.redirect(`${FRONTEND}/login?error=steam_csrf`)
        }
        clearStateCookie(res)
        const token = await steamCallback(query)
        setAuthCookie(res, token)
        res.redirect(`${FRONTEND}/auth/callback`)
    } catch (error) {
        const { message } = getErrorInfo(error)
        console.error("Steam callback error:", message)
        res.redirect(`${FRONTEND}/login?error=steam_failed`)
    }
}
