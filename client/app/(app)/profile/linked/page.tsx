"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-toastify"
import { useAuth } from "@/context/AuthContext"
import ProfileSubLayout from "@/components/profile/ProfileSubLayout"
import { disconnectProvider } from "@/lib/api/users"

const cardStyle = {
  background: "rgba(28,30,42,0.70)",
  border: "1px solid rgba(255,255,255,0.05)",
  borderRadius: 10,
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
} as const

interface ProviderInfo {
  key: "google" | "discord" | "steam"
  label: string
  icon: string
  connectHref: string
}

const PROVIDERS: ProviderInfo[] = [
  {
    key:         "google",
    label:       "Google",
    icon:        "G",
    connectHref: `${process.env.NEXT_PUBLIC_API_URL ?? ""}/auth/google`,
  },
  {
    key:         "discord",
    label:       "Discord",
    icon:        "D",
    connectHref: `${process.env.NEXT_PUBLIC_API_URL ?? ""}/auth/discord`,
  },
  {
    key:         "steam",
    label:       "Steam",
    icon:        "S",
    connectHref: `${process.env.NEXT_PUBLIC_API_URL ?? ""}/auth/steam`,
  },
]

const ICON_COLOR: Record<string, string> = {
  google:  "#EA4335",
  discord: "#5865F2",
  steam:   "#1b2838",
}

export default function LinkedAccountsPage() {
  const router = useRouter()
  const { user, isLoading, updateUser } = useAuth()
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login")
  }, [isLoading, user, router])

  const handleDisconnect = async (provider: "google" | "discord" | "steam") => {
    setDisconnecting(provider)
    try {
      await disconnectProvider(provider)
      updateUser({ [`${provider}Id`]: undefined } as never)
      toast.success(`${provider.charAt(0).toUpperCase() + provider.slice(1)} disconnected`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to disconnect"
      toast.error(msg)
    } finally {
      setDisconnecting(null)
    }
  }

  if (isLoading || !user) return null

  const isConnected = (key: string) => !!(user as unknown as Record<string, unknown>)[`${key}Id`]

  return (
    <ProfileSubLayout title="Linked Accounts">
      <div style={cardStyle} className="overflow-hidden divide-y divide-white/[0.04]">
        {PROVIDERS.map(p => {
          const connected = isConnected(p.key)
          const busy      = disconnecting === p.key

          return (
            <div key={p.key} className="flex items-center gap-4 px-4 py-4">
              {/* Icon */}
              <div
                className="flex items-center justify-center flex-shrink-0 text-white font-bold text-[13px]"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: ICON_COLOR[p.key],
                }}
              >
                {p.icon}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-white">{p.label}</p>
                <p className="text-[11px] mt-0.5" style={{ color: connected ? "#44d62c" : "rgba(255,255,255,0.4)" }}>
                  {connected ? "Connected" : "Not connected"}
                </p>
              </div>

              {connected ? (
                <button
                  onClick={() => handleDisconnect(p.key)}
                  disabled={busy}
                  className="text-[12px] font-medium px-3 py-1.5 transition-opacity disabled:opacity-50"
                  style={{
                    background: "rgba(239,68,68,0.10)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 8,
                    color: "#ef4444",
                    cursor: busy ? "wait" : "pointer",
                  }}
                >
                  {busy ? "…" : "Disconnect"}
                </button>
              ) : (
                <a
                  href={p.connectHref}
                  className="text-[12px] font-medium px-3 py-1.5 no-underline"
                  style={{
                    background: "rgba(100,117,209,0.12)",
                    border: "1px solid rgba(100,117,209,0.25)",
                    borderRadius: 8,
                    color: "#6475D1",
                  }}
                >
                  Connect
                </a>
              )}
            </div>
          )
        })}
      </div>

      <p className="mt-4 text-center text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
        Connecting an account lets you log in with that service.
        You cannot disconnect your only login method.
      </p>
    </ProfileSubLayout>
  )
}
