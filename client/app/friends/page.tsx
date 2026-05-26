"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { useAuth } from "@/context/AuthContext"
import PageBackground from "@/components/ui/PageBackground"
import AppSidebar from "@/components/layout/AppSidebar"
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
        <AppSidebar />

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
