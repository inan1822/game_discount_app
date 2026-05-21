"use client"

import { useEffect, useRef, useState } from "react"
import { getUnreadCount } from "@/lib/api/notifications"
import { useAuth } from "@/context/AuthContext"
import type { UnreadByType } from "@/types/notification"

const POLL_INTERVAL = 60_000 // 60 seconds

export function useUnreadCount() {
  const { user } = useAuth()
  const [counts, setCounts] = useState<UnreadByType>({ events: 0, discounts: 0, total: 0 })
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetch = async () => {
    try {
      const c = await getUnreadCount()
      setCounts(c)
    } catch {
      // silently ignore — don't break the UI if notifications are unavailable
    }
  }

  useEffect(() => {
    if (!user) {
      setCounts({ events: 0, discounts: 0, total: 0 })
      return
    }
    fetch()
    timerRef.current = setInterval(fetch, POLL_INTERVAL)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [user?._id])

  const refresh = () => { fetch() }

  return { counts, refresh }
}
