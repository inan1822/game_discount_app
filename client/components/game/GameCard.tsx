"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import type { Game } from "@/types/game"

interface GameCardProps {
  game:              Game
  rank?:             number
  price?:            string | null
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

/** Format price string: "0.00" → "Free", "unknown" → "Unknown", null/undefined → nothing yet */
export function formatPrice(price: string | null | undefined): string | null {
  if (price == null) return null          // not yet fetched — show nothing
  if (price === "unknown") return "Unknown"
  if (parseFloat(price) === 0) return "Free"
  return `$${price}`
}

export default function GameCard({
  game,
  rank,
  price,
  isFavorited = false,
  onToggleFavorite,
}: GameCardProps) {
  const router    = useRouter()
  const platforms = [...new Set(game.platforms.map(platformLabel))].slice(0, 3)
  const priceDisplay = formatPrice(price)

  return (
    <motion.div
      onClick={() => router.push(`/game/${game.id}`)}
      whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
      whileTap={{ scale: 0.98 }}
      className="relative flex-shrink-0 cursor-pointer select-none group/card"
      style={{ width: 280 }}
    >
      {rank !== undefined && <RankBadge rank={rank} />}
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
          className="absolute bottom-0 left-0 right-0 px-3 py-2.5"
          style={{
            background:           "rgba(28,30,42,0.70)",
            backdropFilter:       "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            borderRadius:         "0 0 10px 10px",
          }}
        >
          {/* Name + rating */}
          <div className="flex items-start justify-between gap-1">
            <p className="text-white text-[14px] font-semibold leading-tight truncate flex-1">
              {game.name}
            </p>
            {game.rating > 0 && (
              <p className="text-[#AE3BD6] text-[12px] font-bold flex-shrink-0">
                ★ {game.rating.toFixed(1)}
              </p>
            )}
          </div>

          {/* Genre */}
          {game.genres.length > 0 && (
            <p className="text-[11px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
              {game.genres.slice(0, 2).join(", ")}
            </p>
          )}

          {/* Platforms + price */}
          <div className="flex items-center justify-between mt-1.5 gap-1">
            <div className="flex gap-1 flex-wrap">
              {platforms.length > 0 ? (
                platforms.map(p => (
                  <span
                    key={p}
                    className="text-[10px] font-semibold px-1.5 py-0.5"
                    style={{
                      background:   "rgba(255,255,255,0.08)",
                      color:        "rgba(255,255,255,0.55)",
                      borderRadius: 4,
                    }}
                  >
                    {p}
                  </span>
                ))
              ) : (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5"
                  style={{
                    background:   "rgba(255,255,255,0.06)",
                    color:        "rgba(255,255,255,0.3)",
                    borderRadius: 4,
                  }}
                >
                  Multi
                </span>
              )}
            </div>

            {/* Price — Free=blue, paid=green, Unknown=dim */}
            {priceDisplay && (
              <span
                className="font-bold flex-shrink-0"
                style={{
                  color: priceDisplay === "Free"
                    ? "#48BCF9"
                    : priceDisplay === "Unknown"
                    ? "rgba(255,255,255,0.3)"
                    : "#5BDE8A",
                  fontSize: priceDisplay === "Unknown" ? 10 : 13,
                }}
              >
                {priceDisplay}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
