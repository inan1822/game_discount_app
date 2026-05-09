"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, User } from "lucide-react"
import { getTrendingGames, getGamesByGenre } from "@/lib/api/games"
import GameCard from "@/components/game/GameCard"
import BottomNav from "@/components/layout/BottomNav"
import type { Game } from "@/types/game"

const TABS = ["Favourites ⭐", "For you", "Popular", "New", "Trended"] as const
type Tab = typeof TABS[number]

export default function HomePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("Popular")
  const [sections, setSections] = useState<Record<string, Game[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadGames()
  }, [])

  const loadGames = async () => {
    try {
      setLoading(true)
      const [trending, rpg, action, adventure, shooter] = await Promise.all([
        getTrendingGames(),
        getGamesByGenre("role-playing-games-rpg"),
        getGamesByGenre("action"),
        getGamesByGenre("adventure"),
        getGamesByGenre("shooter"),
      ])
      setSections({
        "Favourites ⭐": trending.slice(0, 8),
        "For you":       rpg.slice(0, 8),
        "Popular":       action.slice(0, 8),
        "New":           adventure.slice(0, 8),
        "Trended":       shooter.slice(0, 8),
      })
    } catch (err) {
      console.error("Failed to load games:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative pb-24">
      {/* Atmosphere blobs */}
      <div className="blob-purple w-48 h-48 top-0 right-0" />
      <div className="blob-blue w-56 h-56 top-32 -left-16" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-12 pb-4">
        <button
          onClick={() => router.push("/profile")}
          className="w-9 h-9 glass rounded-full flex items-center justify-center"
        >
          <User size={18} className="text-[#9fa0a1]" />
        </button>

        <h1 className="text-xl font-bold text-gradient">⊙DisLow</h1>

        <button
          onClick={() => router.push("/search")}
          className="w-9 h-9 glass rounded-full flex items-center justify-center"
        >
          <Search size={18} className="text-[#9fa0a1]" />
        </button>
      </header>

      {/* Category tabs */}
      <div className="relative z-10 overflow-x-auto scrollbar-hide">
        <div className="flex px-5 pb-2 border-b border-[rgba(188,188,201,0.15)]">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-3 py-2 text-sm font-semibold transition-all border-b-2 -mb-px ${
                activeTab === tab
                  ? "text-[#AE3BD6] border-[#AE3BD6]"
                  : "text-[#9fa0a1] border-transparent hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Game sections */}
      <main className="relative z-10 px-5 space-y-8 mt-4">
        {loading ? (
          <LoadingSkeleton />
        ) : (
          TABS.map(tab => {
            const games = sections[tab] ?? []
            if (games.length === 0) return null
            return (
              <section key={tab}>
                <h2 className="text-white font-bold text-base mb-4">{tab}</h2>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {games.map((game, i) => (
                    <GameCard key={game.id} game={game} rank={i + 1} />
                  ))}
                </div>
              </section>
            )
          })
        )}
      </main>

      <BottomNav />
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      {[...Array(3)].map((_, i) => (
        <div key={i}>
          <div className="h-4 w-24 bg-[#2a2d32] rounded-full mb-4 animate-pulse" />
          <div className="flex gap-3 overflow-hidden">
            {[...Array(3)].map((_, j) => (
              <div
                key={j}
                className="w-[160px] flex-shrink-0 rounded-[20px] bg-[#1c1e2a] animate-pulse"
                style={{ height: 250 }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
