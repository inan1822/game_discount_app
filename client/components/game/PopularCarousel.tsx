"use client"

import {
  motion,
  useScroll,
  useTransform,
  useMotionTemplate,
  useReducedMotion,
} from "framer-motion"
import { useRef, useLayoutEffect, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, ChevronLeft } from "lucide-react"
import type { Game } from "@/types/game"
import { RankBadge, StarButton, formatPrice } from "./GameCard"
import { SectionHeading } from "@/components/ui/SectionHeading"

// ─── Layout constants ─────────────────────────────────────────────────────────

const SIDE_PEEK  = 150  // px of the adjacent card visible on each side
const CARD_HEIGHT = 440 // px
const GAP         = 20  // px between cards

// ─── Helpers ──────────────────────────────────────────────────────────────────

function platformLabel(p: string): string {
  const l = p.toLowerCase()
  if (l.includes("playstation") || l.includes("ps5") || l.includes("ps4")) return "PS"
  if (l.includes("xbox"))        return "Xbox"
  if (l.includes("nintendo") || l.includes("switch")) return "Switch"
  if (l.includes("pc") || l.includes("windows"))      return "PC"
  if (l.includes("ios") || l.includes("iphone"))      return "iOS"
  if (l.includes("android"))     return "Android"
  return p.slice(0, 6)
}

// ─── PopularTile ──────────────────────────────────────────────────────────────

function PopularTile({
  game, rank, price, isFavorited, onToggleFavorite,
  index, scrollX, cardWidth,
}: {
  game:             Game
  rank:             number
  price:            string | undefined
  isFavorited:      boolean
  onToggleFavorite: (e: React.MouseEvent) => void
  index:            number
  scrollX:          ReturnType<typeof useScroll>["scrollX"]
  cardWidth:        number
}) {
  const router       = useRouter()
  const reduce       = useReducedMotion()
  const priceDisplay = formatPrice(price)
  const platforms    = [...new Set(game.platforms.map(platformLabel))].slice(0, 3)

  // scrollX value when this card is perfectly centred
  const centeredAt = index * (cardWidth + GAP)

  // Normalised: 0 = centred, −1 = one card to the right, +1 = one card to the left
  const progress = useTransform(scrollX, (v: number) => (v - centeredAt) / (cardWidth + GAP))

  // ── Transforms — adapted from ScrollTiltedGrid to horizontal axis ───────────
  // Values are intentionally moderate so side cards remain clearly visible.

  // Brightness: side cards clearly dimmed, centre is full
  const bright   = useTransform(progress, [-1, 0, 1], [0.38, 1, 0.38])

  // Blur: noticeable on sides, none at centre
  const blur     = useTransform(progress, [-1, 0, 1], [4, 0, 4])

  // rotateY — the main tilt; 18° is visible but keeps side cards readable
  const rotateY  = useTransform(progress, [-1, 0, 1], [-18, 0, 18])

  // translateZ — shallow depth pop so centre lifts slightly forward
  const tz       = useTransform(progress, [-1, 0, 1], [-50, 0, -50])

  // Scale — side cards shrink slightly, further cards shrink more
  const scale    = useTransform(progress, [-1, 0, 1], [0.88, 1, 0.88])

  // Slight z-rotation lean (same as original `rot`)
  const rot      = useTransform(progress, [-1, 0, 1], [3, 0, -3])

  const filter   = useMotionTemplate`brightness(${bright}) blur(${blur}px)`

  const cardStyle = {
    width:     cardWidth,
    height:    CARD_HEIGHT,
    flexShrink: 0 as const,
    scrollSnapAlign: "center" as const,
    borderRadius: 14,
    overflow: "hidden" as const,
  }

  // ── Reduced-motion fallback ────────────────────────────────────────────────
  if (reduce) {
    return (
      <div
        style={{ ...cardStyle, position: "relative", cursor: "pointer" }}
        onClick={() => router.push(`/game/${game.id}`)}
      >
        <RankBadge rank={rank} />
        <StarButton isFavorited={isFavorited} onToggle={onToggleFavorite} />
        {game.cover && (
          <img src={game.cover} alt={game.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(0,0,0,0.88) 0%,transparent 55%)" }} />
        <TileInfo game={game} priceDisplay={priceDisplay} platforms={platforms} />
      </div>
    )
  }

  // ── Full animated tile ────────────────────────────────────────────────────
  // The outer div owns: width, flex-shrink, snap — no transforms, no overflow clip.
  // The inner motion.div owns: all 3-D + filter transforms + overflow clip.
  // perspective is set on the wrapper div so the transform chain sees it.
  // (Framer Motion v12 excludes `perspective` from MotionCSS style type.)
  return (
    <div style={{ width: cardWidth, flexShrink: 0, scrollSnapAlign: "center", perspective: 1200 }}>
      <motion.div
        className="relative cursor-pointer group/tile overflow-hidden"
        style={{
          width:        "100%",
          height:       CARD_HEIGHT,
          borderRadius: 14,
          rotateY,
          z:            tz,
          rotate:       rot,
          scale,
          filter,
          willChange:   "transform, filter",
        } as any}
        onClick={() => router.push(`/game/${game.id}`)}
      >
        {/* Rank badge */}
        <RankBadge rank={rank} />

        {/* Favourite star */}
        <StarButton isFavorited={isFavorited} onToggle={onToggleFavorite} />

        {/* Cover — plain img, NO inner transform (that was causing the movement) */}
        {game.cover ? (
          <img
            src={game.cover}
            alt={game.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#1c2533,#22182e)" }} />
        )}

        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.15) 55%,transparent 100%)" }}
        />

        <TileInfo game={game} priceDisplay={priceDisplay} platforms={platforms} />
      </motion.div>
    </div>
  )
}

// ─── Bottom info bar ──────────────────────────────────────────────────────────

function TileInfo({ game, priceDisplay, platforms }: {
  game:         Game
  priceDisplay: string | null
  platforms:    string[]
}) {
  return (
    <div className="absolute bottom-0 left-0 right-0 px-5 py-4">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-white font-bold text-[16px] leading-tight line-clamp-2 flex-1">{game.name}</p>
        {game.rating > 0 && (
          <p className="text-[#AE3BD6] text-[13px] font-bold flex-shrink-0">★ {game.rating.toFixed(1)}</p>
        )}
      </div>
      {game.genres.length > 0 && (
        <p className="text-[11px] mb-2.5 truncate" style={{ color: "rgba(255,255,255,0.45)" }}>
          {game.genres.slice(0, 3).join(" · ")}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {platforms.map(p => (
            <span key={p} className="text-[10px] font-semibold px-2 py-0.5"
              style={{ background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.65)", borderRadius: 5 }}>
              {p}
            </span>
          ))}
        </div>
        {priceDisplay && (
          <span className="font-bold flex-shrink-0" style={{
            color:    priceDisplay === "Free"    ? "#48BCF9"
                    : priceDisplay === "Unknown" ? "rgba(255,255,255,0.30)"
                    : "#5BDE8A",
            fontSize: priceDisplay === "Unknown" ? 11 : 16,
          }}>
            {priceDisplay}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Nav button ───────────────────────────────────────────────────────────────

function NavBtn({ dir, onClick }: { dir: "prev" | "next"; onClick: () => void }) {
  const Icon = dir === "next" ? ChevronRight : ChevronLeft
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.90 }}
      className="absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center"
      style={{
        [dir === "next" ? "right" : "left"]: 10,
        width:                38,
        height:               38,
        borderRadius:         "50%",
        background:           "rgba(174,59,214,0.28)",
        border:               "1px solid rgba(174,59,214,0.50)",
        backdropFilter:       "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        boxShadow:            "0 4px 16px rgba(174,59,214,0.2)",
      }}
    >
      <Icon size={17} className="text-white" />
    </motion.button>
  )
}

// ─── PopularCarousel ──────────────────────────────────────────────────────────

export default function PopularCarousel({
  games, prices, wishlistIds, onToggleFavorite, onSeeAll, delay = 0,
}: {
  games:            Game[]
  prices:           Record<number, string>
  wishlistIds:      Set<string>
  onToggleFavorite: (e: React.MouseEvent, game: Game) => void
  onSeeAll:         () => void
  delay?:           number
}) {
  const containerRef                        = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(960)
  const [currentIndex, setCurrentIndex]     = useState(0)

  // Measure the scroll container's width and keep it updated on resize
  useLayoutEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([e]) => setContainerWidth(e.contentRect.width))
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Dynamic card width: fills the viewport minus the two side peeks and gaps
  // containerWidth = SIDE_PEEK + GAP + cardWidth + GAP + SIDE_PEEK
  const cardWidth = Math.min(750, Math.max(240, containerWidth - 2 * (SIDE_PEEK + GAP)))

  // scrollX MotionValue from the container's native horizontal scroll
  const { scrollX } = useScroll({ container: containerRef })

  // Keep currentIndex in sync with native scroll (e.g. touch swipe)
  useEffect(() => {
    return scrollX.on("change", (v: number) => {
      const idx = Math.round(v / (cardWidth + GAP))
      setCurrentIndex(Math.max(0, Math.min(idx, games.length - 1)))
    })
  }, [scrollX, cardWidth, games.length])

  // Re-snap to current card when container resizes (prevents blur on stretch)
  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.scrollTo({ left: currentIndex * (cardWidth + GAP), behavior: "instant" as ScrollBehavior })
  }, [cardWidth])

  // Padding ensures card 0 (and last) can be centred even at scroll start/end
  const sidePadding = SIDE_PEEK + GAP

  const scrollTo = useCallback((idx: number) => {
    if (!containerRef.current) return
    const clamped = Math.max(0, Math.min(idx, games.length - 1))
    containerRef.current.scrollTo({ left: clamped * (cardWidth + GAP), behavior: "smooth" })
  }, [cardWidth, games.length])

  if (games.length === 0) return null

  return (
    <motion.section
      data-section="Popular"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
    >
      <SectionHeading title="Popular" onSeeAll={onSeeAll} delay={delay} />

      {/* Carousel wrapper — overflow:hidden clips any cards beyond the 2 side ones */}
      <div className="relative overflow-hidden" style={{ paddingTop: 8 }}>

        {/* Prev / Next buttons */}
        {currentIndex > 0 && <NavBtn dir="prev" onClick={() => scrollTo(currentIndex - 1)} />}
        {currentIndex < games.length - 1 && <NavBtn dir="next" onClick={() => scrollTo(currentIndex + 1)} />}

        {/* Scroll track */}
        <div
          ref={containerRef}
          className="flex overflow-x-auto"
          style={{
            gap:            GAP,
            paddingLeft:    sidePadding,
            paddingRight:   sidePadding,
            paddingBottom:  12,
            scrollbarWidth: "none",
            scrollSnapType: "x mandatory",
          }}
        >
          {games.map((game, i) => (
            <PopularTile
              key={game.id}
              game={game}
              rank={i + 1}
              price={prices[game.id]}
              isFavorited={wishlistIds.has(String(game.id))}
              onToggleFavorite={(e) => { e.stopPropagation(); onToggleFavorite(e, game) }}
              index={i}
              scrollX={scrollX}
              cardWidth={cardWidth}
            />
          ))}
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mt-2">
          {games.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => scrollTo(i)}
              animate={{
                width:      i === currentIndex ? 20 : 6,
                background: i === currentIndex ? "#AE3BD6" : "rgba(255,255,255,0.18)",
              }}
              transition={{ duration: 0.22 }}
              style={{ height: 6, borderRadius: 3, flexShrink: 0 }}
            />
          ))}
        </div>
      </div>
    </motion.section>
  )
}
