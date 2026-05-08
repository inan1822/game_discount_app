import { Server, type Server as ServerType } from "socket.io"

let io: ServerType | null = null

export const initSocket = (httpServer: any): ServerType => {
    io = new Server(httpServer, {
        cors: {
            origin: ["http://127.0.0.1:5500", "http://localhost:5173"],
            methods: ["GET", "POST"]
        }
    })

    io.on("connection", (socket) => {
        console.log("user connected:", socket.id)

        // לקוח מצטרף לחדר של מוצר ספציפי
        socket.on("join-product", (productId) => {
            socket.join(productId)
            console.log(`socket ${socket.id} joined product room: ${productId}`)
        })


        // לקוח עוזב חדר של מוצר
        socket.on("leave-product", (productId) => {
            socket.leave(productId)
            console.log(`socket ${socket.id} left product room: ${productId}`)
        })

        socket.on("disconnect", () => {
            console.log("user disconnected:", socket.id)
        })
    })

    return io
}

// משמש בכל מקום בקוד לשליחת events
export const getIO = () => {
    if (!io) throw new Error("Socket.IO not initialized")
    return io
}