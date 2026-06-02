"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { io, Socket } from "socket.io-client"
import { getUnreadCount } from "@/features/notifications/services/notifications"
import { useAuth } from "@/features/auth/state/AuthContext"
import type { UnreadByType } from "@/shared/types/notification"

const POLL_INTERVAL = 60_000 // 60 seconds

export function useUnreadCount() {
  const { user } = useAuth()
  const [counts, setCounts] = useState<UnreadByType>({ events: 0, discounts: 0, total: 0 })
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const socketRef = useRef<Socket | null>(null)

  const fetchCounts = useCallback(async () => {
    try {
      const c = await getUnreadCount()
      setCounts(c)
    } catch {
      // silently ignore — don't break the UI if notifications are unavailable
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setCounts({ events: 0, discounts: 0, total: 0 })
      return
    }

    fetchCounts()
    timerRef.current = setInterval(fetchCounts, POLL_INTERVAL)

    // Connect to Socket.io — pass JWT in handshake auth (cookie fallback for same-origin)
    const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1$/, "") ?? "http://localhost:5000"
    const token = typeof window !== "undefined" ? localStorage.getItem("dislow_token") : null
    const socket = io(apiBase, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      auth: token ? { token } : undefined,
    })
    socketRef.current = socket

    socket.on("notification:new", () => {
      // A new notification arrived — refresh the unread count immediately
      fetchCounts()
    })

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      socket.disconnect()
      socketRef.current = null
    }
  }, [user?._id, fetchCounts])

  const refresh = useCallback(() => { fetchCounts() }, [fetchCounts])

  return { counts, refresh }
}
