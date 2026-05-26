"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { io, Socket } from "socket.io-client"
import { getUnreadCount } from "@/lib/api/notifications"
import { useAuth } from "@/context/AuthContext"
import type { UnreadByType } from "@/types/notification"

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

    // Connect to Socket.io using the httpOnly cookie (no token needed in auth)
    const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1$/, "") ?? "http://localhost:5000"
    const socket = io(apiBase, { withCredentials: true, transports: ["websocket", "polling"] })
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
