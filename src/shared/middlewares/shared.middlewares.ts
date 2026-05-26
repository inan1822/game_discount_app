import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import userModel from "../../featchers/users/User.model.js"
import { NextFunction, Request, Response } from "express"

dotenv.config()

/** Read the JWT from the httpOnly cookie, with a fallback to Bearer header. */
function extractToken(req: Request): string | undefined {
    const cookieHeader = req.headers.cookie
    if (cookieHeader) {
        const pair = cookieHeader.split(";").map(c => c.trim()).find(c => c.startsWith("dislow_token="))
        if (pair) return decodeURIComponent(pair.split("=").slice(1).join("="))
    }
    return req.headers.authorization?.split(" ")[1]
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void | Response | NextFunction | Request> => {
    try {
        const inputToken = extractToken(req)
        if (!inputToken) {
            return res.status(401).json({
                status: "401",
                message: "Access Denied: No Token Provided"
            })
        }

        const decoded = jwt.verify(inputToken, process.env.JWT_SECRET!) as { id: string, role: string }
        const user = await userModel.findById(decoded.id)
        if (!user || user.token !== inputToken) {
            return res.status(401).json({ message: "Token is invalid or expired" })
        }
        // Always use the DB role — allows admin promotions to take effect
        // without requiring the user to log out and back in.
        req.user = { ...decoded, role: user.role }

        // Throttled presence ping — only touch DB once per minute per user.
        // Fire-and-forget so the auth check stays fast.
        const lastSeen = user.lastSeenAt?.getTime() ?? 0
        if (Date.now() - lastSeen > 60_000) {
            userModel.updateOne({ _id: user._id }, { $set: { lastSeenAt: new Date() } })
                .catch(() => { /* presence is best-effort */ })
        }

        next();

    } catch (error) {
        res.status(401).json({
            status: "401",
            message: "Invalid or Expired Token",
            data: null
        })
    }
}


