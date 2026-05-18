"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "react-toastify"

/**
 * OAuth callback landing page.
 * The backend redirects here after a successful Discord/Steam login:
 *   http://localhost:3000/auth/callback?token=JWT
 *   http://localhost:3000/auth/callback?error=discord_failed
 */
export default function AuthCallbackPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get("token")
    const error = searchParams.get("error")

    if (token) {
      localStorage.setItem("dislow_token", token)
      toast.success("Logged in! 🎮")
      router.replace("/")
    } else if (error) {
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
    } else {
      router.replace("/login")
    }
  }, [])

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#1E2532]">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
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
