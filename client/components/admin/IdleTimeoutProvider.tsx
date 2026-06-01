"use client"
import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-toastify"
import api from "@/shared/services/axios"

const IDLE_MS = 15 * 60 * 1000

export function IdleTimeoutProvider({ children }: { children: React.ReactNode }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function signOut() {
      try { await api.post("/auth/logout") } catch { /* best-effort */ }
      toast.info("Signed out due to inactivity")
      router.push("/login")
      router.refresh()
    }
    function reset() {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(signOut, IDLE_MS)
    }

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()

    return () => {
      events.forEach(e => window.removeEventListener(e, reset))
      if (timer.current) clearTimeout(timer.current)
    }
  }, [router])

  return <>{children}</>
}
