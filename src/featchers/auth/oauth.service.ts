import jwt from "jsonwebtoken"
import crypto from "crypto"
import mongoose from "mongoose"
import userModel from "../users/User.model.js"
import { AppError } from "../../shared/utils/AppError.js"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeJwt(user: { _id: mongoose.Types.ObjectId | string; name: string; role: string }) {
    if (!process.env.JWT_SECRET) throw new AppError("JWT_SECRET not defined", 500)
    return jwt.sign(
        { id: user._id, name: user.name, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "2h" }
    )
}

/** Random 32-char password so schema validation always passes for OAuth users */
function randomPassword() {
    return crypto.randomBytes(24).toString("hex")
}

// ─── DISCORD ─────────────────────────────────────────────────────────────────

export function discordOAuthUrl(state: string): string {
    const params = new URLSearchParams({
        client_id:     process.env.DISCORD_CLIENT_ID!,
        redirect_uri:  process.env.DISCORD_REDIRECT_URI!,
        response_type: "code",
        scope:         "identify email",
        state,
    })
    return `https://discord.com/oauth2/authorize?${params}`
}

export async function discordCallback(code: string): Promise<string> {
    // 1. Exchange code → access token
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id:     process.env.DISCORD_CLIENT_ID!,
            client_secret: process.env.DISCORD_CLIENT_SECRET!,
            grant_type:    "authorization_code",
            code,
            redirect_uri:  process.env.DISCORD_REDIRECT_URI!,
        }),
    })

    if (!tokenRes.ok) {
        const err = await tokenRes.text()
        throw new AppError(`Discord token exchange failed: ${err}`, 502)
    }

    const { access_token } = await tokenRes.json() as { access_token: string }

    // 2. Fetch Discord user profile
    const profileRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${access_token}` },
    })

    if (!profileRes.ok) throw new AppError("Failed to fetch Discord profile", 502)

    const profile = await profileRes.json() as {
        id: string
        username: string
        email?: string
        avatar?: string
    }

    const email  = profile.email ?? `discord_${profile.id}@placeholder.dislow`
    const avatar = profile.avatar
        ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
        : undefined

    // 3. Find or create user
    let user = await userModel.findOne({ discordId: profile.id })

    if (!user) {
        // If an account with that email already exists — link discord to it
        user = await userModel.findOne({ email })
        if (user) {
            user.discordId = profile.id
            if (avatar) user.avatar = avatar
            await user.save()
        } else {
            // Brand new user
            user = await userModel.create({
                name:       profile.username,
                email,
                password:   randomPassword(),
                discordId:  profile.id,
                avatar,
                isVerified: true,
            })
        }
    }

    // 4. Issue JWT
    const token = makeJwt(user)
    await userModel.findByIdAndUpdate(user._id, { token })
    return token
}

// ─── GOOGLE ──────────────────────────────────────────────────────────────────

export function googleOAuthUrl(state: string): string {
    const params = new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        redirect_uri:  process.env.GOOGLE_REDIRECT_URI!,
        response_type: "code",
        scope:         "openid email profile",
        access_type:   "offline",
        prompt:        "select_account",
        state,
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function googleCallback(code: string): Promise<string> {
    // 1. Exchange code → access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id:     process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type:    "authorization_code",
            code,
            redirect_uri:  process.env.GOOGLE_REDIRECT_URI!,
        }),
    })

    if (!tokenRes.ok) {
        const err = await tokenRes.text()
        throw new AppError(`Google token exchange failed: ${err}`, 502)
    }

    const { access_token } = await tokenRes.json() as { access_token: string }

    // 2. Fetch Google user profile
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${access_token}` },
    })

    if (!profileRes.ok) throw new AppError("Failed to fetch Google profile", 502)

    const profile = await profileRes.json() as {
        id: string
        name: string
        email: string
        picture?: string
    }

    // 3. Find or create user
    let user = await userModel.findOne({ googleId: profile.id })

    if (!user) {
        user = await userModel.findOne({ email: profile.email })
        if (user) {
            user.googleId = profile.id
            if (profile.picture) user.avatar = profile.picture
            await user.save()
        } else {
            user = await userModel.create({
                name:       profile.name,
                email:      profile.email,
                password:   randomPassword(),
                googleId:   profile.id,
                avatar:     profile.picture,
                isVerified: true,
            })
        }
    }

    // 4. Issue JWT
    const token = makeJwt(user)
    await userModel.findByIdAndUpdate(user._id, { token })
    return token
}

// ─── STEAM ───────────────────────────────────────────────────────────────────

export function steamOAuthUrl(state: string): string {
    // Append state as a query param on return_to. Steam echoes return_to back
    // verbatim, so the state survives the round-trip and we read it from req.query.
    const baseReturn = process.env.STEAM_RETURN_URL!
    const returnTo   = `${baseReturn}${baseReturn.includes("?") ? "&" : "?"}state=${encodeURIComponent(state)}`
    const realm      = process.env.STEAM_REALM!
    const params     = new URLSearchParams({
        "openid.ns":         "http://specs.openid.net/auth/2.0",
        "openid.mode":       "checkid_setup",
        "openid.return_to":  returnTo,
        "openid.realm":      realm,
        "openid.identity":   "http://specs.openid.net/auth/2.0/identifier_select",
        "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
    })
    return `https://steamcommunity.com/openid/login?${params}`
}

export async function steamCallback(query: Record<string, string>): Promise<string> {
    // 1. Verify the OpenID assertion with Steam — only the signed openid.* params.
    // Stripping non-openid extras (e.g. our `state`) keeps check_authentication
    // byte-identical to what Steam signed; mixing in extras can produce is_valid:false.
    const openidOnly: Record<string, string> = {}
    for (const [k, v] of Object.entries(query)) {
        if (k.startsWith("openid.")) openidOnly[k] = v
    }
    const verifyParams = new URLSearchParams({ ...openidOnly, "openid.mode": "check_authentication" })

    const verifyRes = await fetch("https://steamcommunity.com/openid/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: verifyParams.toString(),
    })

    const verifyText = await verifyRes.text()
    if (!verifyText.includes("is_valid:true")) {
        throw new AppError("Steam authentication failed", 401)
    }

    // 2. Extract 64-bit Steam ID from claimed_id
    // Format: https://steamcommunity.com/openid/id/76561198XXXXXXXXX
    const claimedId = query["openid.claimed_id"] ?? ""
    const steamId   = claimedId.split("/").pop() ?? ""
    if (!steamId || !/^\d+$/.test(steamId)) {
        throw new AppError("Could not parse Steam ID", 400)
    }

    // 3. Fetch Steam profile
    const steamApiKey = process.env.STEAM_API_KEY
    if (!steamApiKey) throw new AppError("STEAM_API_KEY not configured", 500)

    const profileRes = await fetch(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${steamApiKey}&steamids=${steamId}`
    )

    const profileData = await profileRes.json() as {
        response: { players: Array<{ personaname: string; avatar: string }> }
    }
    const player = profileData.response.players[0]
    if (!player) throw new AppError("Steam profile not found", 404)

    const name   = player.personaname
    const avatar = player.avatar
    const email  = `steam_${steamId}@placeholder.dislow`

    // 4. Find or create user
    let user = await userModel.findOne({ steamId })

    if (!user) {
        user = await userModel.findOne({ email })
        if (user) {
            user.steamId = steamId
            if (avatar) user.avatar = avatar
            await user.save()
        } else {
            user = await userModel.create({
                name,
                email,
                password:   randomPassword(),
                steamId,
                avatar,
                isVerified: true,
            })
        }
    }

    // 5. Issue JWT
    const token = makeJwt(user)
    await userModel.findByIdAndUpdate(user._id, { token })
    return token
}
