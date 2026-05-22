"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Home, BellRing, Search as SearchIcon, Users, User,
  ChevronRight, Pencil, Lock, Link2,
  HelpCircle, MessageSquare, Bug, FileText, ScrollText, Download, Trash2,
  LogOut,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import PageBackground from "@/components/ui/PageBackground"
import StatsRow from "@/components/profile/StatsRow"
import AvatarPicker from "@/components/profile/AvatarPicker"
import PreferenceToggle from "@/components/profile/PreferenceToggle"
import NotificationDot from "@/components/ui/NotificationDot"
import { useUnreadCount } from "@/hooks/useUnreadCount"
import { getMyStats, updateNotificationPrefs, type MyStats } from "@/lib/api/users"
import { toast } from "react-toastify"

const glassStyle = {
  background: "rgba(30, 38, 51, 0.70)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
} as const

const cardStyle = {
  background: "rgba(28,30,42,0.70)",
  border: "1px solid rgba(255,255,255,0.05)",
  borderRadius: 14,
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
} as const

const NAV = [
  { icon: Home,       label: "Home",          href: "/"              },
  { icon: BellRing,   label: "Notifications", href: "/notifications" },
  { icon: SearchIcon, label: "Search",        href: "/search"        },
  { icon: Users,      label: "Friends",       href: "/friends"       },
  { icon: User,       label: "Profile",       href: "/profile"       },
] as const

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

function NavItem({
  icon: Icon, label, active, dot, onClick,
}: { icon: React.ElementType; label: string; active: boolean; dot?: React.ReactNode; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className="w-full flex items-center gap-3 px-3 py-2.5 mb-0.5 text-[16px] font-medium relative"
      style={{
        borderRadius: 10,
        color: active ? "#48BCF9" : "rgba(255,255,255,0.45)",
        background: active ? "rgba(52,82,229,0.13)" : "transparent",
        border: "none",
        cursor: "pointer",
      }}
    >
      {active && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2"
          style={{ width: 3, height: 20, background: "#48BCF9", borderRadius: "0 4px 4px 0" }}
        />
      )}
      <Icon size={15} />
      <span className="flex-1 text-left">{label}</span>
      {dot}
    </motion.button>
  )
}

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
  const { counts } = useUnreadCount()

  const [stats, setStats] = useState<MyStats>({ following: 0, followers: 0, favorites: 0 })
  const [statsLoading, setStatsLoading] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)

  const handlePrefChange = async (pref: "events" | "discounts", next: boolean) => {
    try {
      await updateNotificationPrefs({ [pref]: next })
      updateUser({ notificationPrefs: { ...user!.notificationPrefs!, [pref]: next } })
    } catch {
      toast.error("Failed to update preference")
      throw new Error("pref update failed") // causes PreferenceToggle to revert
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
      <main className="w-screen h-screen flex items-center justify-center" style={{ background: "#1E2532" }}>
        <div className="text-white/40 text-sm">Loading…</div>
      </main>
    )
  }

  const userInitial = user.name?.charAt(0)?.toUpperCase() ?? "?"

  return (
    <main className="relative w-screen h-screen overflow-hidden" style={{ background: "#1E2532" }}>
      <PageBackground />

      <div className="relative flex h-full" style={{ zIndex: 3 }}>
        {/* ══════════ SIDEBAR ══════════ */}
        <aside
          className="flex flex-col flex-shrink-0 h-full"
          style={{ width: 240, ...glassStyle, borderRight: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-3 px-5 pt-6 pb-5">
            <img src="/icons/logo.svg" alt="" style={{ width: 30, height: 30 }} />
            <span className="text-white font-bold text-[17px] tracking-wide">DisLow</span>
          </div>

          <div className="px-3 mb-1">
            <p
              className="text-[9px] font-bold tracking-[0.12em] px-3 mb-2"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              MENU
            </p>
            {NAV.map(({ icon, label, href }) => (
              <NavItem
                key={label}
                icon={icon}
                label={label}
                active={label === "Profile"}
                dot={label === "Notifications"
                  ? <NotificationDot events={counts.events} discounts={counts.discounts} />
                  : undefined
                }
                onClick={() => router.push(href)}
              />
            ))}
          </div>

          <div className="flex-1" />

          <button
            onClick={logout}
            className="flex items-center gap-3 px-8 py-5 text-[16px] font-medium hover:text-white transition-colors"
            style={{ color: "rgba(255,255,255,0.35)", borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF6B4A]" />
            log out
          </button>
        </aside>

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
                  <img
                    src={user.avatar}
                    alt="Your avatar"
                    width={80}
                    height={80}
                    loading="lazy"
                    style={{ borderRadius: "50%", width: 80, height: 80, objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <div
                    className="flex items-center justify-center text-white text-2xl font-bold"
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #AE3BD6, #6475D1)",
                      boxShadow: "0 8px 24px rgba(174,59,214,0.35)",
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

              {/* Private toggle — visual only this phase */}
              <button
                type="button"
                title="Coming soon"
                disabled
                className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 text-[12px] cursor-not-allowed"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 999,
                  color: "rgba(255,255,255,0.45)",
                }}
              >
                Private Account
                <span
                  className="inline-block"
                  style={{
                    width: 26,
                    height: 14,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.08)",
                    position: "relative",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 2, left: 2,
                      width: 10, height: 10,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.4)",
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
    </main>
  )
}
