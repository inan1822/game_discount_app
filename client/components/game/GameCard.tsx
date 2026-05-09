"use client"

import { useRouter } from "next/navigation"
import { Heart } from "lucide-react"
import { useWishlist } from "@/context/WishlistContext"
import type { Game } from "@/types/game"

interface GameCardProps {
  game: Game
  rank?: number
}

export default function GameCard({ game, rank }: GameCardProps) {
  const router = useRouter()
  const { isInWishlist, toggle } = useWishlist()
  const inWishlist = isInWishlist(String(game.id))

  return (
    <div
      onClick={() => router.push(`/game/${game.id}`)}
      className="relative rounded-[20px] overflow-hidden cursor-pointer flex-shrink-0 w-[160px]"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {/* Cover image */}
      <div className="aspect-[3/4] bg-[#2a2d32] relative">
        {game.cover ? (
          <img
            src={game.cover}
            alt={game.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#9fa0a1] text-xs text-center px-2">
            {game.name}
          </div>
        )}

        {/* Rank badge */}
        {rank !== undefined && (
          <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-[#AE3BD6] flex items-center justify-center text-xs font-bold text-white glow-purple">
            {rank}
          </div>
        )}

        {/* Heart button */}
        <button
          onClick={e => { e.stopPropagation(); toggle(game) }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full glass flex items-center justify-center transition-all"
        >
          <Heart
            size={14}
            className={inWishlist ? "text-[#AE3BD6] fill-[#AE3BD6]" : "text-white"}
          />
        </button>
      </div>

      {/* Info */}
      <div className="bg-[#1c1e2a] px-3 py-2">
        <p className="text-white text-xs font-semibold truncate">{game.name}</p>
        <p className="text-[#9fa0a1] text-[10px] truncate mt-0.5">
          {game.genres.slice(0, 2).join(", ")}
        </p>

        {/* Platform icons row */}
        <div className="flex gap-1 mt-1.5">
          {game.platforms.slice(0, 4).map(p => (
            <PlatformDot key={p} platform={p} />
          ))}
        </div>
      </div>
    </div>
  )
}

// Small platform indicator dot with color coding
function PlatformDot({ platform }: { platform: string }) {
  const p = platform.toLowerCase()
  const color =
    p.includes("playstation") ? "#003087" :
    p.includes("xbox")        ? "#107C10" :
    p.includes("nintendo")    ? "#E4000F" :
    p.includes("pc") || p.includes("windows") ? "#1b2838" :
    "#6475D1"

  const initial = platform.charAt(0).toUpperCase()

  return (
    <div
      title={platform}
      className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white"
      style={{ background: color }}
    >
      {initial}
    </div>
  )
}
