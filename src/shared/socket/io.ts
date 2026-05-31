import { Server as SocketIOServer, Socket } from "socket.io"
import type { Server as HttpServer } from "http"
import jwt from "jsonwebtoken"
import { registerChatHandlers } from "../../featchers/chat/chat.socket.js"

let io: SocketIOServer | null = null

export interface SocketUser {
    id: string
    role: string
}

export function initSocket(httpServer: HttpServer, allowedOrigins: string[]): SocketIOServer {
    io = new SocketIOServer(httpServer, {
        cors: {
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes(origin)) callback(null, true)
                else callback(new Error("Origin not allowed"))
            },
            credentials: true,
        },
    })

    io.use((socket, next) => {
        // Token may arrive in handshake.auth.token or the dislow_token cookie
        let token: string | undefined
        const authToken = socket.handshake.auth?.token
        if (typeof authToken === "string" && authToken) {
            token = authToken
        } else {
            const cookieHeader = socket.handshake.headers.cookie
            if (cookieHeader) {
                const pair = cookieHeader.split(";").map(c => c.trim()).find(c => c.startsWith("dislow_token="))
                if (pair) token = decodeURIComponent(pair.split("=").slice(1).join("="))
            }
        }
        if (!token) return next(new Error("Unauthorized"))

        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET!) as SocketUser
            socket.data.user = payload
            next()
        } catch {
            next(new Error("Invalid token"))
        }
    })

    io.on("connection", (socket) => {
        const user = socket.data.user as SocketUser

        if (user.role === "admin") {
            socket.join("admins")
            console.log(`[Socket] admin ${user.id} connected`)
        } else {
            // Regular users join their private room so the cron can push notifications
            socket.join(`user:${user.id}`)
            console.log(`[Socket] user ${user.id} connected`)
        }

        // Chat relay handlers (typing indicators etc.) — message delivery is
        // driven server-side from the chat service via emitToUser().
        registerChatHandlers(socket)

        socket.on("disconnect", () => {
            console.log(`[Socket] ${user.role} ${user.id} disconnected`)
        })
    })

    return io
}

export function getIO(): SocketIOServer {
    if (!io) throw new Error("Socket.io not initialized — call initSocket() first")
    return io
}

/** Emit a notification event to a specific user's socket room */
export function emitNotification(userId: string, payload: object) {
    try {
        getIO().to(`user:${userId}`).emit("notification:new", payload)
    } catch {
        // Socket not initialized yet (e.g. during tests) — ignore
    }
}

/** Emit an arbitrary event to a specific user's socket room (all their tabs/devices). */
export function emitToUser(userId: string, event: string, payload: object) {
    try {
        getIO().to(`user:${userId}`).emit(event, payload)
    } catch {
        // Socket not initialized yet (e.g. during tests) — ignore
    }
}

/** Re-export the socket type for handler modules. */
export type { Socket }
