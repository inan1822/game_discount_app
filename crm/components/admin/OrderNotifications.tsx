"use client"
import { useEffect } from "react"
import { io, type Socket } from "socket.io-client"
import { toast } from "react-toastify"
import type { NewOrderEvent } from "@/types/admin"

export function OrderNotifications() {
  useEffect(() => {
    // Cookie-based auth: the httpOnly dislow_token cookie rides along with
    // `withCredentials: true`. The server reads it from the handshake headers.
    // We never put the token in a query string (see references/socketio-auth.md).
    const socket: Socket = io(process.env.NEXT_PUBLIC_API_URL!, {
      withCredentials: true,
      transports: ["websocket"],
    })

    socket.on("order:new", (order: NewOrderEvent) => {
      toast.success(`New order: $${order.amount.toFixed(2)} from ${order.customerEmail}`)
    })

    socket.on("connect_error", (err) => {
      console.error("[Socket] connect_error:", err.message)
    })

    return () => { socket.disconnect() }
  }, [])

  return null
}
