"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, Heart } from "lucide-react"
import { useWishlist } from "@/context/WishlistContext"
import BottomNav from "@/components/layout/BottomNav"

// No manual auth check needed — middleware.ts redirects guests to /login
// before this component ever renders.
export default function WishlistPage() {
  const router = useRouter()
  const { items, toggle, isLoading } = useWishlist()

  const gameList = (
    <>
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-[16px] bg-[#1c1e2a] animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Heart size={48} className="text-[#2a2d32] mb-4" />
          <p className="text-[#9fa0a1] text-sm">No games saved yet</p>
          <p className="text-[#9fa0a1] text-xs mt-1">Tap ❤️ on any game to add it here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div
              key={item._id}
              className="flex items-center gap-3 glass rounded-[16px] p-3 cursor-pointer hover:border-[#AE3BD6]/30 border border-transparent transition-all"
              onClick={() => router.push(`/game/${item.gameId}`)}
            >
              <div className="w-14 h-14 rounded-[12px] overflow-hidden flex-shrink-0 bg-[#2a2d32]">
                {item.gameCover ? (
                  <img src={item.gameCover} alt={item.gameName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#9fa0a1] text-xs">
                    {item.gameName.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{item.gameName}</p>
                <p className="text-[#9fa0a1] text-xs mt-0.5">
                  Added {new Date(item.addedAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={e => {
                  e.stopPropagation()
                  toggle({ id: parseInt(item.gameId), name: item.gameName, cover: item.gameCover, slug: item.gameSlug })
                }}
                className="w-8 h-8 flex items-center justify-center flex-shrink-0"
              >
                <Heart size={18} className="text-[#AE3BD6] fill-[#AE3BD6]" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )

  return (
    <>
      {/* ── Desktop layout — shell provided by (app)/layout.tsx ── */}
      <div className="hidden md:block flex-1 min-w-0 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        <div className="max-w-2xl mx-auto px-8 py-10">
          <div className="flex items-center gap-4 mb-8">
            <h1 className="text-white text-2xl font-bold">Favourites</h1>
            <span className="ml-auto text-sm" style={{ color: "#9fa0a1" }}>{items.length} games</span>
          </div>
          {gameList}
        </div>
      </div>

      {/* ── Mobile layout ── */}
      <div className="md:hidden relative pb-24 min-h-screen">
        <div className="blob-purple w-48 h-48 top-0 right-0" />
        <header className="relative z-10 flex items-center gap-4 px-5 pt-12 pb-6">
          <button onClick={() => router.back()} className="w-9 h-9 glass rounded-full flex items-center justify-center">
            <ArrowLeft size={18} className="text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">Favourites</h1>
          <span className="ml-auto text-[#9fa0a1] text-sm">{items.length} games</span>
        </header>
        <main className="relative z-10 px-5">
          {gameList}
        </main>
        <BottomNav />
      </div>
    </>
  )
}
