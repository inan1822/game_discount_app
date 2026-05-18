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
 * Corner-shaped purple rank badge — top-left of the card.
 * Uses the exact SVG from eventbackgroundNumbers.svg.
 * Container offset -7 so the purple shape sits flush with the card corner.
 */
export function RankBadge({ rank }: { rank: number }) {
  return (
    <div
      className="absolute z-10"
      style={{ top: -7, left: -7, width: 51, height: 47, pointerEvents: "none" }}
    >
      <svg
        width="51" height="47" viewBox="0 0 51 47" fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0"
      >
        <g filter="url(#filter0_d_3523_2959)">
          <path
            d="M5.5 15.5C5.5 9.97715 9.97715 5.5 15.5 5.5H44.9098C45.2358 5.5 45.5 5.76423 45.5 6.09016V6.09016C45.5 25.6465 29.6465 41.5 10.0902 41.5H6.15574C5.79359 41.5 5.5 41.2064 5.5 40.8443V15.5Z"
            fill="#AE3BD6"
          />
        </g>
        <defs>
          <filter
            id="filter0_d_3523_2959" x="0" y="0" width="51" height="47"
            filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix in="SourceAlpha" type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feMorphology radius="1" operator="dilate" in="SourceAlpha" result="effect1_dropShadow_3523_2959" />
            <feOffset />
            <feGaussianBlur stdDeviation="2.25" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix"
              values="0 0 0 0 0.682353 0 0 0 0 0.231373 0 0 0 0 0.839216 0 0 0 0.4 0" />
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_3523_2959" />
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_3523_2959" result="shape" />
          </filter>
        </defs>
      </svg>

      {/* Number — +7 offset to compensate for the container's -7 shift */}
      <span
        className="absolute text-white font-bold"
        style={{ fontSize: 13, top: 17, left: 18, lineHeight: 1, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
      >
        {rank}
      </span>
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
      onClick={onToggle}
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
        style={{ height: 380, background: "#16101F", borderRadius: 10 }}
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
            style={{ background: "linear-gradient(135deg, #1c2a3a, #2a1c3a)" }}
          />
        )}

        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.10) 55%, transparent 100%)",
          }}
        />

        {/* Info bar — overlays the image */}
        <div
          className="absolute bottom-0 left-0 right-0 px-3 py-3"
          style={{
            background:           "rgba(28,30,42,0.70)",
            backdropFilter:       "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            borderRadius:         "0 0 10px 10px",
          }}
        >
          {/* Name + rating */}
          <div className="flex items-start justify-between gap-1">
            <p className="text-white text-[18px] font-semibold leading-tight truncate flex-1">
              {game.name}
            </p>
            {game.rating > 0 && (
              <p className="text-[#AE3BD6] text-[15px] font-bold flex-shrink-0">
                ★ {game.rating.toFixed(1)}
              </p>
            )}
          </div>

          {/* Genre */}
          {game.genres.length > 0 && (
            <p className="text-[15px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
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
                    className="text-[15px] font-semibold px-1.5 py-0.5"
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
                  className="text-[15px] font-semibold px-1.5 py-0.5"
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

            {/* Price — 14px. Free=blue, paid=green, Unknown=gray */}
            {priceDisplay && (
              <span
                className="text-[15px] font-bold flex-shrink-0"
                style={{
                  color: priceDisplay === "Free"
                    ? "#48BCF9"
                    : priceDisplay === "Unknown"
                    ? "rgba(255,255,255,0.3)"
                    : "#5BDE8A",
                  fontSize: priceDisplay === "Unknown" ? 13 : 15,
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
