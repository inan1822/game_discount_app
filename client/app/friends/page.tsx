"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  Home, BellRing, Search as SearchIcon, Users, User, LogIn,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import PageBackground from "@/components/ui/PageBackground"
import NotificationDot from "@/components/ui/NotificationDot"
import { useUnreadCount } from "@/hooks/useUnreadCount"
import FollowingPanel from "@/components/friends/FollowingPanel"
import FollowersPanel from "@/components/friends/FollowersPanel"
import RequestsPanel  from "@/components/friends/RequestsPanel"
import AddFriendPanel from "@/components/friends/AddFriendPanel"

const TABS = ["Following", "Followers", "Requests", "Add Friend"] as const
type Tab = typeof TABS[number]

const TAB_PARAM: Record<Tab, string> = {
  "Following":   "following",
  "Followers":   "followers",
  "Requests":    "requests",
  "Add Friend":  "add",
}

const PARAM_TO_TAB: Record<string, Tab> = {
  following: "Following",
  followers: "Followers",
  requests:  "Requests",
  add:       "Add Friend",
}

const NAV = [
  { icon: Home,        label: "Home",          href: "/"              },
  { icon: BellRing,    label: "Notifications", href: "/notifications" },
  { icon: SearchIcon,  label: "Search",        href: "/search"        },
  { icon: Users,       label: "Friends",       href: "/friends"       },
  { icon: User,        label: "Profile",       href: "/profile"       },
] as const

const glassStyle = {
  background: "rgba(30, 38, 51, 0.70)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
} as const

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

function FriendsContent() {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const { user, logout, isLoading } = useAuth()
  const { counts } = useUnreadCount()
  const isLoggedIn = !!user

  const initialTab = PARAM_TO_TAB[searchParams.get("tab") ?? ""] ?? "Following"
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [incomingCount, setIncomingCount] = useState(0)

  useEffect(() => {
    if (!isLoading && !isLoggedIn) router.replace("/login")
  }, [isLoading, isLoggedIn, router])

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", TAB_PARAM[tab])
    router.replace(`/friends?${params.toString()}`, { scroll: false })
  }

  if (isLoading || !isLoggedIn) return null

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
            <p className="text-[9px] font-bold tracking-[0.12em] px-3 mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>MENU</p>
            {NAV.map(({ icon: Icon, label, href }) => (
              <NavItem
                key={label}
                icon={Icon}
                label={label}
                active={label === "Friends"}
                dot={label === "Notifications"
                  ? <NotificationDot events={counts.events} discounts={counts.discounts} />
                  : undefined}
                onClick={() => router.push(href)}
              />
            ))}
          </div>

          <div className="flex-1" />

          {isLoggedIn ? (
            <button
              onClick={logout}
              className="flex items-center gap-3 px-8 py-5 text-[16px] font-medium"
              style={{ color: "rgba(255,255,255,0.35)", borderTop: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF6B4A]" />log out
            </button>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="flex items-center gap-3 px-8 py-5 text-[16px] font-semibold"
              style={{ color: "#48BCF9", borderTop: "1px solid rgba(255,255,255,0.05)" }}
            >
              <LogIn size={15} />Log in
            </button>
          )}
        </aside>

        {/* ══════════ RIGHT PANEL ══════════ */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto" style={{ paddingLeft: 20, paddingRight: 80, paddingTop: 24, scrollbarWidth: "none" }}>
            <motion.h1
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-white text-[26px] font-bold mb-5"
            >
              Friends
            </motion.h1>

            {/* Tab bar — glass card */}
            <div
              className="flex items-stretch overflow-x-auto mb-5"
              style={{
                background: "rgba(28,30,42,0.70)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 14,
                padding: 4,
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                scrollbarWidth: "none",
              }}
            >
              {TABS.map(tab => {
                const active = activeTab === tab
                const showBadge = tab === "Requests" && incomingCount > 0
                return (
                  <button
                    key={tab}
                    onClick={() => handleTabClick(tab)}
                    className="flex-1 px-4 py-2.5 text-[13px] whitespace-nowrap transition-colors relative"
                    style={{
                      background: active ? "rgba(100,117,209,0.20)" : "transparent",
                      color:      active ? "#6475D1"               : "rgba(255,255,255,0.45)",
                      fontWeight: active ? 600 : 400,
                      borderRadius: 10,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {tab}
                    {showBadge && (
                      <span
                        className="ml-2 inline-flex items-center justify-center text-[10px] font-bold"
                        style={{
                          background: "#6475D1",
                          color: "#fff",
                          minWidth: 18,
                          height: 18,
                          padding: "0 5px",
                          borderRadius: 999,
                        }}
                      >
                        {incomingCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="pb-12">
              {activeTab === "Following"  && <FollowingPanel />}
              {activeTab === "Followers"  && <FollowersPanel />}
              {activeTab === "Requests"   && <RequestsPanel onCountChange={setIncomingCount} />}
              {activeTab === "Add Friend" && <AddFriendPanel />}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function FriendsPage() {
  return (
    <Suspense fallback={null}>
      <FriendsContent />
    </Suspense>
  )
}
