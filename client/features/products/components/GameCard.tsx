"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import type { CardPrice, Game } from "@/shared/types/game"
import { useCardPrice } from "@/features/products/utils/useCardPrice"
import { rawgImage, rawgImageFull } from "@/lib/rawgImage"
import { TiltCard } from "@/shared/components/TiltCard"
import { PlatformIcon, hasPlatformIcon } from "@/shared/components/PlatformIcon"

interface ImageSize {
  /** px number or any CSS length string, e.g. "clamp(260px, 40vw, 491px)" */
  w:            number | string
  /** px number or CSS string. Omit when aspectRatio is set. */
  h?:           number | string
  /** CSS aspect-ratio string, e.g. "491/301". When set, h is ignored and
   *  the card height follows the width automatically. */
  aspectRatio?: string
}

interface GameCardProps {
  game:              Game
  rank?:             number
  isFavorited?:      boolean
  onToggleFavorite?: (e: React.MouseEvent) => void
  imageSize?:        ImageSize
  /**
   * When true, the slice of cover art that would sit behind the info bar is
   * replaced by a 20px slice of the image stretched down to fill that zone.
   * Everything above the info bar shows the cover normally.
   */
  stretchImage?:     boolean
  /**
   * When true, the card expands to fill 100% of its parent container height.
   * Use this in bento layouts where the hero should match the adjacent column.
   * Requires stretchImage — the image grows via flex instead of aspect-ratio.
   */
  fillParentHeight?: boolean
}

/** Normalise a RAWG platform name → short label */
function platformLabel(platform: string): string {
  const p = platform.toLowerCase()
  if (p.includes("playstation") || p.includes("ps5") || p.includes("ps4") || p.includes("ps3")) return "PS"
  if (p.includes("xbox"))       return "Xbox"
  if (p.includes("nintendo") || p.includes("switch")) return "Switch"
  if (p.includes("linux"))      return "Linux"
  if (p.includes("pc") || p.includes("windows") || p.includes("mac")) return "PC"
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
  const pts = "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
  return (
    <motion.button
      onClick={(e) => { e.stopPropagation(); onToggle(e) }}
      whileHover={{ scale: 1.2 }}
      whileTap={{ scale: 0.85 }}
      className="absolute z-10 flex items-center justify-center"
      style={{
        top: 10, right: 10,
        width: 28, height: 28,
        background: "transparent",
        border: "none",
        padding: 0,
      }}
      title={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      {/* Blurred glow copy — only visible when favorited */}
      {isFavorited && (
        <svg
          width="18" height="18" viewBox="0 0 24 24"
          fill="#49BCF9"
          aria-hidden
          style={{ position: "absolute", filter: "blur(6px)", opacity: 0.70, pointerEvents: "none" }}
        >
          <polygon points={pts} />
        </svg>
      )}
      {/* Crisp star on top */}
      <svg
        width="16" height="16" viewBox="0 0 24 24"
        fill={isFavorited ? "#48BCF9" : "none"}
        stroke={isFavorited ? "#48BCF9" : "rgba(255,255,255,0.75)"}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ position: "relative" }}
      >
        <polygon points={pts} />
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
  imageSize,
  stretchImage = false,
  fillParentHeight = false,
}: GameCardProps) {
  // CSS values for TiltCard width and card-body height/aspectRatio
  const cardWCss  = imageSize?.w ?? 280
  const cardHCss  = imageSize?.aspectRatio ? undefined : (imageSize?.h ?? 380)
  const aspectRatioCss = imageSize?.aspectRatio

  const router = useRouter()
  const price  = useCardPrice(game)

  // How many display-px of the cover are stretched to fill the info-bar zone.
  const STRETCH = 10

  // Measure info-bar height (varies per game — genre line may be absent).
  const infoRef  = useRef<HTMLDivElement>(null)
  const [infoH, setInfoH] = useState(80)

  // Measure actual rendered card height (needed when height comes from aspectRatio).
  const cardBodyRef  = useRef<HTMLDivElement>(null)
  const [renderedCardH, setRenderedCardH] = useState<number>(
    typeof cardHCss === "number" ? cardHCss : 301
  )

  useEffect(() => {
    if (!stretchImage) return
    const infoEl  = infoRef.current
    const cardEl  = cardBodyRef.current
    if (!infoEl || !cardEl) return

    const update = () => {
      setInfoH(infoEl.offsetHeight)
      setRenderedCardH(cardEl.offsetHeight)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(infoEl)
    ro.observe(cardEl)
    return () => ro.disconnect()
  }, [stretchImage])
  const safePlatforms = Array.isArray(game.platforms)
    ? game.platforms.filter((p): p is string => typeof p === "string")
    : []
  const platforms = [...new Set(safePlatforms.map(platformLabel))].slice(0, 3)

  return (
    <TiltCard
      tiltLimit={12}
      scale={1.04}
      spotlight
      className="flex-shrink-0 select-none group/card"
      style={{
        width:    cardWCss,
        height:   fillParentHeight ? "100%" : undefined,
        cursor:   "pointer",
        overflow: "visible",
      }}
      onClick={() => router.push(`/game/${game.id}`)}
    >
      {onToggleFavorite && (
        <StarButton isFavorited={isFavorited} onToggle={onToggleFavorite} />
      )}

      {stretchImage ? (
        /* ── STRETCH MODE — image above, info bar flows below with STRETCH px overlap ── */
        <div style={{
          position:        "relative",
          background:      "#1C1E2A",
          borderRadius:    10,
          overflow:        "hidden",
          /* fillParentHeight: become a flex column so image grows to fill */
          height:          fillParentHeight ? "100%" : undefined,
          display:         fillParentHeight ? "flex"  : undefined,
          flexDirection:   fillParentHeight ? "column": undefined,
        }}>

          {/* Image wrapper — aspect ratio determines height, or flex-grow when filling parent */}
          <div
            ref={cardBodyRef}
            className="relative"
            style={{
              // aspect-ratio is ALWAYS the base size. In fillParentHeight mode we
              // add flex:"1 1 auto" so the image grows to fill any extra height the
              // grid cell gives it (2-col bento) but falls back to the aspect-ratio
              // height when the column is its natural size (1-col stacked layout).
              aspectRatio: aspectRatioCss ?? "16/9",
              flex:        fillParentHeight ? "1 1 auto" : undefined,
            }}
          >
            {game.cover ? (
              <img
                src={rawgImageFull(game.cover)}
                alt={game.name}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ objectPosition: "top" }}
              />
            ) : (
              <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #1c2533, #22182e)" }} />
            )}
          </div>

          {/* Layer 2 — lives in outer container so it can extend behind the info bar.
              Takes STRETCH px from the image bottom and scales to fill infoH. */}
          {game.cover && (
            <div
              className="absolute left-0 right-0 bottom-0 overflow-hidden"
              style={{ height: infoH, zIndex: 0 }}
              aria-hidden
            >
              <img
                src={rawgImageFull(game.cover)}
                alt=""
                loading="lazy"
                className="absolute left-0 w-full object-cover"
                style={{
                  top:             -(renderedCardH - STRETCH),
                  height:          renderedCardH,
                  objectPosition:  "top",
                  transformOrigin: `center ${renderedCardH - STRETCH}px`,
                  transform:       `scaleY(${infoH / STRETCH})`,
                }}
              />
            </div>
          )}

          {/* Info bar — flows below the image, overlaps by STRETCH px.
              Background is mostly transparent so the stretched cover shows
              through; text stays legible via blur + text-shadow. */}
          <div
            ref={infoRef}
            className="px-3 py-3"
            style={{
              marginTop:            -STRETCH,
              position:             "relative",
              zIndex:               1,
              background:           "linear-gradient(to bottom, rgba(18,19,26,0.80) 0%, rgba(18,19,26,0.60) 100%)",
              backdropFilter:       "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              borderRadius:         "0 0 10px 10px",
              textShadow:           "0 1px 4px rgba(0,0,0,0.9)",
            }}
          >
            <InfoContent game={game} platforms={platforms} price={price} platformsAsIcons />
          </div>
        </div>
      ) : (
        /* ── NORMAL MODE — info bar overlaid on image ── */
        <div
          className="relative overflow-hidden"
          style={{
            height:      cardHCss,
            aspectRatio: aspectRatioCss,
            background:  "#1C1E2A",
            borderRadius: 10,
          }}
        >
          {game.cover ? (
            <img
              src={rawgImage(game.cover)}
              alt={game.name}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
            />
          ) : (
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #1c2533, #22182e)" }} />
          )}

          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.05) 50%, transparent 100%)" }}
          />

          {/* Info bar */}
          <div
            ref={infoRef}
            className="absolute bottom-0 left-0 right-0 px-3 py-3"
            style={{
              background:           "rgba(28,30,42,0.75)",
              backdropFilter:       "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              borderRadius:         "0 0 10px 10px",
            }}
          >
            <InfoContent game={game} platforms={platforms} price={price} />
          </div>
        </div>
      )}
    </TiltCard>
  )
}

// ── Shared info bar content ───────────────────────────────────────────────────
function InfoContent({ game, platforms, price, platformsAsIcons = false }: {
  game:             Game
  platforms:        string[]
  price:            CardPrice | null | undefined
  /** Render console glyphs instead of text labels (e.g. PC/PS/Xbox icons). */
  platformsAsIcons?: boolean
}) {
  return (
    <>
      <p className="text-white text-[18px] font-medium leading-tight truncate">
        {game.name || "Unknown Game"}
      </p>

      {/* Always render the genre line so every card's info bar is the same
          height (title + genre + platform/price row). When a game has no
          genre we render a non-breaking space to hold the line's height —
          this keeps all cards equal height without any fixed pixel values. */}
      <p className="text-[13px] mt-1 truncate min-h-[1.2em]" style={{ color: "rgba(255,255,255,0.45)" }}>
        {game.genres.length > 0 ? game.genres.slice(0, 2).join(" · ") : " "}
      </p>

      <div className="flex items-center justify-between mt-2 gap-1">
        <div className={platformsAsIcons ? "flex items-center gap-2 flex-wrap" : "flex gap-1.5 flex-wrap"}>
          {platforms.length > 0 ? (
            platforms.map(p =>
              platformsAsIcons && hasPlatformIcon(p) ? (
                <PlatformIcon key={p} platform={p} size={15} style={{ color: "rgba(255,255,255,0.60)" }} />
              ) : (
                <span key={p} className="text-[13px] font-medium px-2 py-0.5"
                  style={{ background: "rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.60)", borderRadius: 5 }}>
                  {p}
                </span>
              )
            )
          ) : (
            <span className="text-[13px] font-semibold"
              style={{ color: "rgba(255,255,255,0.35)" }}>
              Multi
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-1.5 flex-shrink-0">
          {price && price.cut > 0 && (
            <span className="text-[13px]"
              style={{ color: "rgba(180,180,180,0.5)", lineHeight: "1.35" }}>
              ${price.regular.toFixed(2)}
            </span>
          )}
          <span className="font-medium"
            style={{
              color: price === undefined ? "rgba(255,255,255,0.18)"
                   : price === null      ? "rgba(255,255,255,0.30)"
                   : price.isFree        ? "#48BCF9"
                   : "#5BDE8A",
              fontSize: price != null && price !== undefined ? 18 : 13,
            }}>
            {price === undefined ? "···"
           : price === null      ? "—"
           : price.isFree        ? "Free"
           : `$${price.price.toFixed(2)}`}
          </span>
        </div>
      </div>
    </>
  )
}
