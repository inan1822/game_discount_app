"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import type { Game } from "@/types/game"
import { useCardPrice } from "@/hooks/useCardPrice"

interface GameCardProps {
  game:              Game
  rank?:             number
  isFavorited?:      boolean
  onToggleFavorite?: (e: React.MouseEvent) => void
}

/** Normalise a RAWG platform name → short label */
function platformLabel(platform: string): string {
  const p = platform.toLowerCase()
  if (p.includes("playstation") || p.includes("ps5") || p.includes("ps4") || p.includes("ps3")) return "PS"
  if (p.includes("xbox"))       return "Xbox"
  if (p.includes("nintendo") || p.includes("switch")) return "Switch"
  if (p.includes("pc") || p.includes("windows") || p.includes("linux") || p.includes("mac")) return "PC"
  if (p.includes("ios") || p.includes("iphone") || p.includes("ipad")) return "iOS"
  if (p.includes("android"))    return "Android"
  return platform.slice(0, 5)
}

/**
 * Side-tab rank badge — flush with the left edge of the card.
 * A narrow purple pill that sticks out from the left side with the rank number.
 */
export function RankBadge({ rank }: { rank: number }) {
  return (
    <div
      className="absolute z-10 flex items-center justify-center font-bold text-white"
      style={{
        top:          14,
        left:         0,
        width:        28,
        height:       36,
        background:   "linear-gradient(180deg, #C652F0 0%, #8B2FB3 100%)",
        borderRadius: "0 10px 10px 0",
        boxShadow:    "2px 0 12px rgba(174,59,214,0.50)",
        fontSize:     13,
        letterSpacing: "-0.5px",
        pointerEvents: "none",
      }}
    >
      {rank}
    </div>
  )
}

/** Blue star favourite button — top-right */
export function StarButton({
  isFavorited,
  onToggle,
}: {
  isFavorited: boolean
  onToggle:    (e: React.MouseEvent) => void
}) {
  return (
    <motion.button
      onClick={(e) => { e.stopPropagation(); onToggle(e) }}
      whileHover={{ scale: 1.2 }}
      whileTap={{ scale: 0.85 }}
      className="absolute z-10 flex items-center justify-center"
      style={{
        top: 10, right: 10,
        width: 28, height: 28,
        borderRadius: 8,
        background: isFavorited
          ? "rgba(72,188,249,0.18)"
          : "rgba(0,0,0,0.35)",
        backdropFilter:       "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        border: isFavorited
          ? "1px solid rgba(72,188,249,0.4)"
          : "1px solid rgba(255,255,255,0.08)",
      }}
      title={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <svg
        width="14" height="14" viewBox="0 0 24 24"
        fill={isFavorited ? "#48BCF9" : "none"}
        stroke={isFavorited ? "#48BCF9" : "rgba(255,255,255,0.6)"}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </motion.button>
  )
}

/**
 * Steam-style rating chip data: prefer Metacritic (0–100, authoritative critic
 * score), fall back to RAWG user rating × 20 to get the same 0–100 scale that
 * Steam uses for its review summary percentage.
 * Returns null when we have no real data — we never fabricate a number.
 */
export function deriveRating(game: Game): { label: string; pct: number; source: "mc" | "user" } | null {
  if (typeof game.metacritic === "number" && game.metacritic > 0) {
    return { label: String(game.metacritic), pct: game.metacritic, source: "mc" }
  }
  if (typeof game.rating === "number" && game.rating > 0) {
    const pct = Math.round(game.rating * 20)
    return { label: `${pct}%`, pct, source: "user" }
  }
  return null
}

/** Steam-style color thresholds: green ≥75, yellow 40–74, red <40 */
export function ratingColor(pct: number): string {
  if (pct >= 75) return "#5BDE8A"
  if (pct >= 40) return "#F5C84B"
  return "#E26A6A"
}

export default function GameCard({
  game,
  rank,
  isFavorited = false,
  onToggleFavorite,
}: GameCardProps) {
  const router = useRouter()
  const price  = useCardPrice(game)
  const safePlatforms = Array.isArray(game.platforms)
    ? game.platforms.filter((p): p is string => typeof p === "string")
    : []
  const platforms = [...new Set(safePlatforms.map(platformLabel))].slice(0, 3)

  return (
    <motion.div
      onClick={() => router.push(`/game/${game.id}`)}
      whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
      whileTap={{ scale: 0.98 }}
      className="relative flex-shrink-0 cursor-pointer select-none group/card"
      style={{ width: 280 }}
    >
          {onToggleFavorite && (
        <StarButton isFavorited={isFavorited} onToggle={onToggleFavorite} />
      )}

      {/* Card body */}
      <div
        className="relative overflow-hidden"
        style={{ height: 380, background: "#1C1E2A", borderRadius: 10 }}
      >
        {game.cover ? (
          <img
            src={game.cover}
            alt={game.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, #1c2533, #22182e)" }}
          />
        )}

        {/* Gradient overlay — dark bottom so info bar stays readable */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.05) 50%, transparent 100%)",
          }}
        />

        {/* Info bar — glassmorphic strip over the image */}
        <div
          className="absolute bottom-0 left-0 right-0 px-3 py-3"
          style={{
            background:           "rgba(28,30,42,0.75)",
            backdropFilter:       "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            borderRadius:         "0 0 10px 10px",
          }}
        >
          {/* Name */}
          <p className="text-white text-[15px] font-bold leading-tight truncate">
            {game.name}
          </p>

          {/* Genre */}
          {game.genres.length > 0 && (
            <p className="text-[12px] mt-1 truncate" style={{ color: "rgba(255,255,255,0.45)" }}>
              {game.genres.slice(0, 2).join(" · ")}
            </p>
          )}

          {/* Platforms + price */}
          <div className="flex items-center justify-between mt-2 gap-1">
            <div className="flex gap-1.5 flex-wrap">
              {platforms.length > 0 ? (
                platforms.map(p => (
                  <span
                    key={p}
                    className="text-[11px] font-semibold px-2 py-0.5"
                    style={{
                      background:   "rgba(255,255,255,0.09)",
                      color:        "rgba(255,255,255,0.60)",
                      borderRadius: 5,
                    }}
                  >
                    {p}
                  </span>
                ))
              ) : (
                <span
                  className="text-[11px] font-semibold px-2 py-0.5"
                  style={{
                    background:   "rgba(255,255,255,0.06)",
                    color:        "rgba(255,255,255,0.35)",
                    borderRadius: 5,
                  }}
                >
                  Multi
                </span>
              )}
            </div>

            {/* Price + discount badge — always shown */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {price && price.cut > 0 && (
                <span
                  className="font-bold text-[11px] px-1.5 py-0.5"
                  style={{ background: "rgba(68,214,44,0.15)", color: "#44d62c", borderRadius: 4 }}
                >
                  -{price.cut}%
                </span>
              )}
              <span
                className="font-bold"
                style={{
                  color: price === undefined ? "rgba(255,255,255,0.18)"
                       : price === null      ? "rgba(255,255,255,0.30)"
                       : price.isFree        ? "#48BCF9"
                       : "#5BDE8A",
                  fontSize: price != null && price !== undefined ? 14 : 11,
                }}
              >
                {price === undefined
                  ? "···"
                  : price === null
                  ? "Unknown"
                  : price.isFree
                  ? "Free"
                  : `$${price.price.toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
