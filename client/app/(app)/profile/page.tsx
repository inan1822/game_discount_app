"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import {
  ChevronRight, Pencil, Lock, Link2,
  HelpCircle, MessageSquare, Bug, FileText, ScrollText, Download, Trash2,
  LogOut,
} from "@/shared/icons"
import { useAuth } from "@/features/auth/state/AuthContext"
import StatsRow from "@/components/profile/StatsRow"
import AvatarPicker from "@/components/profile/AvatarPicker"
import PreferenceToggle from "@/components/profile/PreferenceToggle"
import { getMyStats, updateNotificationPrefs, updatePrivacy, type MyStats } from "@/features/profile/services/users"
import { toast } from "react-toastify"

const cardStyle = {
  background: "rgba(28,30,42,0.70)",
  border: "1px solid rgba(255,255,255,0.05)",
  borderRadius: 10,
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
} as const

const ACCOUNT_LINKS = [
  { icon: Pencil, label: "Edit Profile",    href: "/profile/edit"     },
  { icon: Lock,   label: "Change Password", href: "/profile/password" },
  { icon: Link2,  label: "Linked Accounts", href: "/profile/linked"   },
] as const

const SUPPORT_LINKS = [
  { icon: HelpCircle,    label: "Help Center",     href: "/profile/support/help"     },
  { icon: MessageSquare, label: "Send Feedback",   href: "/profile/support/feedback" },
  { icon: Bug,           label: "Report a Bug",    href: "/profile/support/bug"      },
  { icon: FileText,      label: "Privacy Policy",  href: "/profile/support/privacy"  },
  { icon: ScrollText,    label: "Terms of Service",href: "/profile/support/terms"    },
  { icon: Download,      label: "Export My Data",  href: "/profile/support/export"   },
  { icon: Trash2,        label: "Delete Account",  href: "/profile/delete"           },
] as const

function LinkRow({
  icon: Icon, label, href,
}: { icon: React.ElementType; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5"
      style={{ color: "rgba(255,255,255,0.85)" }}
    >
      <Icon size={16} style={{ color: "rgba(255,255,255,0.55)" }} />
      <span className="flex-1 text-[14px]">{label}</span>
      <ChevronRight size={16} style={{ color: "rgba(255,255,255,0.3)" }} />
    </Link>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, isLoading, logout, updateUser } = useAuth()

  const [stats, setStats] = useState<MyStats>({ following: 0, followers: 0, favorites: 0 })
  const [statsLoading, setStatsLoading] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)

  const [threshold, setThreshold] = useState<number>(10)
  const [thresholdSaving, setThresholdSaving] = useState(false)
  const [privacySaving, setPrivacySaving] = useState(false)

  // Sync threshold once user data is available
  useEffect(() => {
    if (user?.notificationPrefs?.discountThreshold != null) {
      setThreshold(user.notificationPrefs.discountThreshold)
    }
  }, [user?.notificationPrefs?.discountThreshold])

  const handlePrivacyToggle = async () => {
    if (privacySaving || !user) return
    const next = !user.isPrivate
    updateUser({ isPrivate: next })
    setPrivacySaving(true)
    try {
      await updatePrivacy(next)
    } catch {
      updateUser({ isPrivate: !next })
      toast.error("Failed to update privacy setting")
    } finally {
      setPrivacySaving(false)
    }
  }

  const handlePrefChange = async (pref: "events" | "discounts", next: boolean) => {
    try {
      await updateNotificationPrefs({ [pref]: next })
      updateUser({ notificationPrefs: { ...user!.notificationPrefs!, [pref]: next } })
    } catch {
      toast.error("Failed to update preference")
      throw new Error("pref update failed") // causes PreferenceToggle to revert
    }
  }

  const handleThresholdCommit = async (value: number) => {
    setThresholdSaving(true)
    try {
      await updateNotificationPrefs({ discountThreshold: value })
      updateUser({ notificationPrefs: { ...user!.notificationPrefs!, discountThreshold: value } })
    } catch {
      toast.error("Failed to save threshold")
    } finally {
      setThresholdSaving(false)
    }
  }

  // Gate: redirect to /login if unauthenticated
  useEffect(() => {
    if (!isLoading && !user) router.replace("/login")
  }, [isLoading, user, router])

  // Fetch stats — keyed on user id so it refetches if the user changes
  useEffect(() => {
    if (!user?._id) return
    let cancelled = false
    setStatsLoading(true)
    getMyStats()
      .then(s => { if (!cancelled) setStats(s) })
      .catch(() => { /* leave defaults */ })
      .finally(() => { if (!cancelled) setStatsLoading(false) })
    return () => { cancelled = true }
  }, [user?._id])

  if (isLoading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-white/40 text-sm">Loading…</div>
      </div>
    )
  }

  const userInitial = user.name?.charAt(0)?.toUpperCase() ?? "?"

  return (
    // Shell (sidebar + background) provided by (app)/layout.tsx
    <>
      <div className="contents">

        {/* ══════════ AVATAR PICKER MODAL ══════════ */}
        {pickerOpen && (
          <AvatarPicker
            currentAvatar={user.avatar}
            onClose={() => setPickerOpen(false)}
            onUpdated={(url) => updateUser({ avatar: url })}
          />
        )}

        {/* ══════════ CONTENT ══════════ */}
        <div className="flex-1 min-w-0 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <div className="max-w-2xl mx-auto px-8 py-10 space-y-8">
            {/* Avatar block */}
            <section className="flex flex-col items-center text-center">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="relative mb-4 group"
                style={{ width: 80, height: 80, borderRadius: "50%", padding: 0, border: "none", cursor: "pointer" }}
                aria-label="Change avatar"
              >
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt="Your avatar"
                    width={80}
                    height={80}
                    sizes="80px"
                    style={{ borderRadius: "50%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <div
                    className="flex items-center justify-center text-white text-2xl font-bold"
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #6475D1, #2ab7e6)",
                      boxShadow: "0 8px 24px rgba(100,117,209,0.35)",
                    }}
                  >
                    {userInitial}
                  </div>
                )}
                {/* Edit overlay on hover */}
                <div
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ borderRadius: "50%", background: "rgba(0,0,0,0.5)", fontSize: 13, color: "white" }}
                >
                  Edit
                </div>
              </button>
              <h1 className="text-white text-xl font-bold">{user.name}</h1>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>{user.email}</p>

              <button
                type="button"
                onClick={handlePrivacyToggle}
                disabled={privacySaving}
                className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 text-[12px]"
                style={{
                  background: user?.isPrivate ? "rgba(174,59,214,0.12)" : "rgba(255,255,255,0.04)",
                  border: user?.isPrivate ? "1px solid rgba(174,59,214,0.30)" : "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 999,
                  color: user?.isPrivate ? "#AE3BD6" : "rgba(255,255,255,0.55)",
                  cursor: privacySaving ? "wait" : "pointer",
                  opacity: privacySaving ? 0.6 : 1,
                  transition: "all 0.2s",
                }}
              >
                {user?.isPrivate ? "Private Account" : "Public Account"}
                <span
                  style={{
                    width: 26,
                    height: 14,
                    borderRadius: 999,
                    background: user?.isPrivate ? "#AE3BD6" : "rgba(255,255,255,0.15)",
                    position: "relative",
                    display: "inline-block",
                    transition: "background 0.2s",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      left: user?.isPrivate ? 14 : 2,
                      width: 10, height: 10,
                      borderRadius: "50%",
                      background: "white",
                      transition: "left 0.2s",
                    }}
                  />
                </span>
              </button>
            </section>

            {/* Stats */}
            <StatsRow
              following={stats.following}
              followers={stats.followers}
              favorites={stats.favorites}
              loading={statsLoading}
            />

            {/* Notification Preferences */}
            <section>
              <h2
                className="text-[10px] font-bold tracking-[0.18em] uppercase mb-3 px-1"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Notification Preferences
              </h2>
              <div className="overflow-hidden divide-y divide-white/[0.04]" style={cardStyle}>
                <PreferenceToggle
                  label="Events"
                  description="In-game events from your favorites"
                  checked={user.notificationPrefs?.events ?? true}
                  accentColor="#AE3BD6"
                  onChange={(next) => handlePrefChange("events", next)}
                />
                <PreferenceToggle
                  label="Discounts"
                  description="Price drops from your favorites"
                  checked={user.notificationPrefs?.discounts ?? true}
                  accentColor="#44d62c"
                  onChange={(next) => handlePrefChange("discounts", next)}
                />

                {/* Discount threshold slider */}
                <div className="px-4 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-white text-[13px] font-medium">Minimum discount</p>
                      <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>
                        Only notify when a game drops by at least this much
                      </p>
                    </div>
                    <span
                      className="text-[15px] font-bold flex-shrink-0 ml-4"
                      style={{ color: thresholdSaving ? "rgba(255,255,255,0.4)" : "#44d62c", minWidth: 40, textAlign: "right" }}
                    >
                      {threshold}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={80}
                    step={5}
                    value={threshold}
                    onChange={e => setThreshold(Number(e.target.value))}
                    onMouseUp={e => handleThresholdCommit(Number((e.target as HTMLInputElement).value))}
                    onTouchEnd={e => handleThresholdCommit(Number((e.target as HTMLInputElement).value))}
                    disabled={thresholdSaving}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                      accentColor: "#44d62c",
                      background: `linear-gradient(to right, #44d62c ${((threshold - 5) / 75) * 100}%, rgba(255,255,255,0.12) ${((threshold - 5) / 75) * 100}%)`,
                    }}
                  />
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>5%</span>
                    <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>80%</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Account */}
            <section>
              <h2
                className="text-[10px] font-bold tracking-[0.18em] uppercase mb-3 px-1"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Account
              </h2>
              <div className="overflow-hidden divide-y divide-white/[0.04]" style={cardStyle}>
                {ACCOUNT_LINKS.map(l => (
                  <LinkRow key={l.href} icon={l.icon} label={l.label} href={l.href} />
                ))}
              </div>
            </section>

            {/* Support */}
            <section>
              <h2
                className="text-[10px] font-bold tracking-[0.18em] uppercase mb-3 px-1"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Support
              </h2>
              <div className="overflow-hidden divide-y divide-white/[0.04]" style={cardStyle}>
                {SUPPORT_LINKS.map(l => (
                  <LinkRow key={l.href} icon={l.icon} label={l.label} href={l.href} />
                ))}
              </div>
            </section>

            {/* Log Out */}
            <button
              onClick={logout}
              className="flex items-center justify-center gap-2 w-full py-3 text-[14px] font-semibold transition-colors hover:bg-red-500/10"
              style={{
                color: "#ef4444",
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.15)",
                borderRadius: 10,
              }}
            >
              <LogOut size={16} />
              Log Out
            </button>

            <div style={{ height: 24 }} />
          </div>
        </div>
      </div>
    </>
  )
}
