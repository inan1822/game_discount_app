"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { useAuth } from "@/context/AuthContext"
import FollowingPanel from "@/components/friends/FollowingPanel"
import FollowersPanel from "@/components/friends/FollowersPanel"
import RequestsPanel  from "@/components/friends/RequestsPanel"
import AddFriendPanel from "@/components/friends/AddFriendPanel"
import { SectionHeading } from "@/components/ui/SectionHeading"
import { GlowCard }       from "@/components/ui/spotlight-card"
import { listRequests } from "@/lib/api/users"

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

function FriendsContent() {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const { user, isLoading } = useAuth()
  const isLoggedIn = !!user

  const initialTab = PARAM_TO_TAB[searchParams.get("tab") ?? ""] ?? "Following"
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [incomingCount, setIncomingCount] = useState(0)

  useEffect(() => {
    if (!isLoading && !isLoggedIn) router.replace("/login")
  }, [isLoading, isLoggedIn, router])

  // Fetch incoming request count at hub level so the Requests badge is visible
  // on ALL tabs, not just when the Requests tab has been opened.
  useEffect(() => {
    if (!isLoggedIn) return
    listRequests()
      .then(d => setIncomingCount(d.incoming.length))
      .catch(() => {})
  }, [isLoggedIn])

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", TAB_PARAM[tab])
    router.replace(`/friends?${params.toString()}`, { scroll: false })
  }

  if (isLoading || !isLoggedIn) return null

  const tabXp: Record<Tab, number> = {
    "Following":  0.125,
    "Followers":  0.375,
    "Requests":   0.625,
    "Add Friend": 0.875,
  }

  return (
    // Shell (sidebar + background) provided by (app)/layout.tsx
    <div
      style={{
        width:        "min(calc(100% - 192px), 1600px)",
        marginInline: "auto",
        paddingBlock: 40,
      }}
    >
      <SectionHeading title="Friends" />

      {/* Tab bar */}
      <GlowCard
        customSize
        glowColor="blue"
        pinned={{ xp: tabXp[activeTab], yp: 0.95 }}
        className="!rounded-[12px] !p-1 !aspect-auto !backdrop-blur-none !shadow-none mb-5 flex gap-1"
        style={{
          width:      "100%",
          background: "rgba(28,30,42,0.40)",
          border:     "1px solid rgba(31,37,57,0.6)",
          ["--base"   as any]: "220",
          ["--spread" as any]: "0",
        }}
      >
        {TABS.map(tab => {
          const active     = activeTab === tab
          const showBadge  = tab === "Requests" && incomingCount > 0
          return (
            <motion.button
              key={tab}
              onClick={() => handleTabClick(tab)}
              whileTap={{ scale: 0.96 }}
              className="flex-1 relative z-10 after:absolute after:inset-[-60px] after:content-['']"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                borderRadius: 9, padding: "8px 0",
                fontSize: 18, fontWeight: active ? 700 : 500,
                color:      active ? "#6475D1" : "rgba(255,255,255,0.4)",
                background: "transparent",
                border:     "1px solid transparent",
                cursor:     "pointer",
                transition: "all 0.25s",
                whiteSpace: "nowrap",
              }}
            >
              {tab}
              {showBadge && (
                <span style={{
                  background: "#6475D1", color: "#fff",
                  minWidth: 18, height: 18, padding: "0 5px",
                  borderRadius: 999, fontSize: 10, fontWeight: 700,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}>
                  {incomingCount}
                </span>
              )}
            </motion.button>
          )
        })}
      </GlowCard>

      <div className="pb-12">
        {activeTab === "Following"  && <FollowingPanel />}
        {activeTab === "Followers"  && <FollowersPanel />}
        {activeTab === "Requests"   && <RequestsPanel onCountChange={setIncomingCount} />}
        {activeTab === "Add Friend" && <AddFriendPanel />}
      </div>
    </div>
  )
}

export default function FriendsPage() {
  return (
    <Suspense fallback={null}>
      <FriendsContent />
    </Suspense>
  )
}
