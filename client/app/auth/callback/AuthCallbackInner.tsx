"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "react-toastify"

/**
 * Inner component that reads search params from the OAuth redirect.
 * Must be a separate component so the parent page can wrap it in <Suspense>
 * (Next.js App Router requirement for useSearchParams in static pages).
 */
export default function AuthCallbackInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const error = searchParams.get("error")
    const token = searchParams.get("token")

    if (!error) {
      // Store token for cross-domain Bearer auth (cookie may be blocked by browser)
      if (token) localStorage.setItem("dislow_token", token)
      toast.success("Logged in! 🎮")
      router.replace("/")
    } else {
      const messages: Record<string, string> = {
        discord_denied: "Discord login was cancelled.",
        discord_failed: "Discord login failed. Try again.",
        steam_denied:   "Steam login was cancelled.",
        steam_failed:   "Steam login failed. Try again.",
        google_denied:  "Google login was cancelled.",
        google_failed:  "Google login failed. Try again.",
      }
      toast.error(messages[error] ?? "Login failed. Try again.")
      router.replace("/login")
    }
  }, [searchParams, router])

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#1E2532]">
      <div className="flex flex-col items-center gap-4">
        <svg
          className="animate-spin"
          width="40" height="40" viewBox="0 0 40 40" fill="none"
        >
          <circle cx="20" cy="20" r="16" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
          <path
            d="M36 20a16 16 0 0 0-16-16"
            stroke="#AE3BD6" strokeWidth="4" strokeLinecap="round"
          />
        </svg>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
          Signing you in…
        </p>
      </div>
    </div>
  )
}
