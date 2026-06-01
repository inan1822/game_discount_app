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
import type { Game } from "@/shared/types/game"
import { StarButton } from "./GameCard"
import { useCardPrice } from "@/features/products/utils/useCardPrice"
import { SectionHeading } from "@/shared/components/SectionHeading"

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
  game, rank, isFavorited, onToggleFavorite,
  index, scrollX, cardWidth,
}: {
  game:             Game
  rank:             number
  isFavorited:      boolean
  onToggleFavorite: (e: React.MouseEvent) => void
  index:            number
  scrollX:          ReturnType<typeof useScroll>["scrollX"]
  cardWidth:        number
}) {
  const router    = useRouter()
  const reduce    = useReducedMotion()
  const price     = useCardPrice(game)
  const platforms = [...new Set(game.platforms.map(platformLabel))].slice(0, 3)

  // scrollX value when this card is perfectly centred.
  // Derivation: scrollLeft_centered = paddingLeft + i*step + cardWidth/2 - clientWidth/2.
  // With paddingLeft = sidePadding and clientWidth ≈ containerBorderBoxWidth,
  // AND sidePadding = (containerBorderBoxWidth - cardWidth)/2 (our setup),
  // those terms collapse and centeredAt = i * (cardWidth + GAP).
  const centeredAt = index * (cardWidth + GAP)

  // Normalised: 0 = centred, −1 = one card to the right, +1 = one card to the left
  const progress = useTransform(scrollX, (v: number) => (v - centeredAt) / (cardWidth + GAP))

  // ── Transforms — adapted from ScrollTiltedGrid to horizontal axis ───────────
  // Values are intentionally moderate so side cards remain clearly visible.

  // Brightness: side cards clearly dimmed, centre is full.
  // Flat dead-zone around 0 so the centered card stays at brightness 1 even
  // when scroll position doesn't perfectly snap to an integer multiple.
  const bright   = useTransform(progress, [-1, -0.15, 0.15, 1], [0.38, 1, 1, 0.38])

  // Blur: noticeable on sides, ZERO across the centre dead-zone (same reason).
  const blur     = useTransform(progress, [-1, -0.15, 0.15, 1], [4, 0, 0, 4])

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
        <StarButton isFavorited={isFavorited} onToggle={onToggleFavorite} />
        {game.cover && (
          <img src={game.cover} alt={game.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(0,0,0,0.88) 0%,transparent 55%)" }} />
        <TileInfo game={game} price={price} platforms={platforms} />
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

        <TileInfo game={game} price={price} platforms={platforms} />
      </motion.div>
    </div>
  )
}

// ─── Bottom info bar ──────────────────────────────────────────────────────────

function TileInfo({ game, price, platforms }: {
  game:      Game
  price:     ReturnType<typeof useCardPrice>
  platforms: string[]
}) {
  return (
    <div className="absolute bottom-0 left-0 right-0 px-5 py-4">
      <p className="text-white font-bold text-[18px] leading-tight line-clamp-2 mb-1">{game.name}</p>
      {game.genres.length > 0 && (
        <p className="text-[12px] mb-2.5 truncate" style={{ color: "rgba(255,255,255,0.50)" }}>
          {game.genres.slice(0, 3).join(" · ")}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {platforms.map(p => (
            <span key={p} className="text-[11px] font-semibold px-2 py-0.5"
              style={{ background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.65)", borderRadius: 5 }}>
              {p}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {price && price.cut > 0 && (
            <span className="font-bold text-[12px] px-1.5 py-0.5"
              style={{ background: "rgba(68,214,44,0.15)", color: "#44d62c", borderRadius: 4 }}>
              -{price.cut}%
            </span>
          )}
          <span className="font-bold"
            style={{
              color:    price === undefined ? "rgba(255,255,255,0.18)"
                      : price === null      ? "rgba(255,255,255,0.30)"
                      : price.isFree        ? "#48BCF9"
                      : "#5BDE8A",
              fontSize: price != null && price !== undefined ? 18 : 13,
            }}>
            {price === undefined
              ? "···"
              : price === null
              ? "—"
              : price.isFree
              ? "Free"
              : `$${price.price.toFixed(2)}`}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Nav button ───────────────────────────────────────────────────────────────

// Arrow path from Figma asset (arrow_next.svg / arrow_next_hoverd.svg)
const ARROW_PATH = "M61.0672 54.9335L53.572 47.4407C53.4323 47.301 53.2663 47.1902 53.0837 47.1145C52.9011 47.0389 52.7054 47 52.5077 47C52.1085 47 51.7257 47.1585 51.4434 47.4407C51.3036 47.5804 51.1928 47.7463 51.1171 47.9289C51.0415 48.1114 51.0026 48.3071 51.0026 48.5047C51.0026 48.9038 51.1611 49.2865 51.4434 49.5687L57.8893 55.9974L51.4434 62.4262C51.3029 62.5655 51.1914 62.7313 51.1153 62.9139C51.0392 63.0965 51 63.2924 51 63.4902C51 63.688 51.0392 63.8839 51.1153 64.0665C51.1914 64.2491 51.3029 64.4149 51.4434 64.5542C51.5828 64.6946 51.7486 64.8061 51.9312 64.8822C52.1139 64.9583 52.3098 64.9974 52.5077 64.9974C52.7056 64.9974 52.9015 64.9583 53.0842 64.8822C53.2669 64.8061 53.4327 64.6946 53.572 64.5542L61.0672 57.0614C61.2077 56.9221 61.3192 56.7564 61.3953 56.5738C61.4714 56.3911 61.5106 56.1953 61.5106 55.9974C61.5106 55.7996 61.4714 55.6037 61.3953 55.4211C61.3192 55.2385 61.2077 55.0728 61.0672 54.9335Z"

function NavBtn({ dir, onClick }: { dir: "prev" | "next"; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  const filterId = `navbtn-glow-${dir}`

  return (
    <motion.button
      onClick={onClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileTap={{ scale: 0.90 }}
      className="absolute top-1/2 -translate-y-1/2 z-20"
      style={{
        
        [dir === "next" ? "right" : "left"]: -8,
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
      }}
    >
      <svg
        width="180" height="180" viewBox="0 0 112 112" fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          transform: dir === "prev" ? "scaleX(-1)" : undefined,
          transition: "filter 0.2s",
          filter: hovered ? "drop-shadow(0 0 8px #3396E6)" : "none",
        }}
      >
        <defs>
          <filter id={filterId} x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="20" />
          </filter>
        </defs>

        {/* Blurred glow circle — intensifies on hover */}
        <motion.circle
          cx="56" cy="56" r="16"
          fill="#3594E2"
          filter={`url(#${filterId})`}
          animate={{ opacity: hovered ? 1 : 0.65 }}
          transition={{ duration: 0.2 }}
        />

        {/* Arrow — stroke only by default, fills on hover */}
        <motion.path
          d={ARROW_PATH}
          animate={{
            fill:         hovered ? "#3396E6" : "transparent",
            stroke:       "#3396E6",
            strokeOpacity: hovered ? 0 : 0.85,
          }}
          transition={{ duration: 0.18 }}
        />
      </svg>
    </motion.button>
  )
}

// ─── PopularCarousel ──────────────────────────────────────────────────────────

export default function PopularCarousel({
  games, wishlistIds, onToggleFavorite, onSeeAll, delay = 0,
}: {
  games:            Game[]
  wishlistIds:      Set<string>
  onToggleFavorite: (e: React.MouseEvent, game: Game) => void
  onSeeAll:         () => void
  delay?:           number
}) {
  const containerRef                        = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(960)
  const [currentIndex, setCurrentIndex]     = useState(0)

  // Measure the scroll container's BORDER-BOX width (includes padding).
  // CRITICAL: must NOT use contentRect.width — that gives the content-box,
  // which shrinks when padding grows. Since sidePadding depends on this width,
  // using content-box creates a ResizeObserver feedback loop: padding grows →
  // content-box shrinks → padding recomputes → infinite layout thrash.
  useLayoutEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([e]) => {
      const w = e.borderBoxSize?.[0]?.inlineSize ?? e.contentRect.width
      setContainerWidth(w)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Dynamic card width: fills the viewport minus the two side peeks and gaps
  // containerWidth = SIDE_PEEK + GAP + cardWidth + GAP + SIDE_PEEK
  const cardWidth = Math.min(750, Math.max(240, containerWidth - 2 * (SIDE_PEEK + GAP)))

  // Padding ensures card 0 (and last) can be centred even at scroll start/end.
  // CRITICAL: must equal (containerWidth - cardWidth) / 2 so the CSS scroll-snap
  // position equals i * (cardWidth + GAP) — which is what `progress` assumes.
  // Without this, on wide screens cardWidth caps at 750 while padding stays at
  // SIDE_PEEK+GAP, causing the snapped card to have non-zero progress → it ends
  // up off-center and slightly blurred.
  const sidePadding = Math.max(SIDE_PEEK + GAP, (containerWidth - cardWidth) / 2)

  // scrollX MotionValue from the container's native horizontal scroll
  const { scrollX } = useScroll({ container: containerRef })

  // Keep currentIndex in sync with native scroll (e.g. touch swipe).
  useEffect(() => {
    return scrollX.on("change", (v: number) => {
      const idx = Math.round(v / (cardWidth + GAP))
      setCurrentIndex(Math.max(0, Math.min(idx, games.length - 1)))
    })
  }, [scrollX, cardWidth, games.length])

  // Re-snap to current card when container resizes (prevents blur on stretch).
  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.scrollTo({
      left: currentIndex * (cardWidth + GAP),
      behavior: "instant" as ScrollBehavior,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardWidth, sidePadding])

  const scrollTo = useCallback((idx: number) => {
    if (!containerRef.current) return
    const clamped = Math.max(0, Math.min(idx, games.length - 1))
    containerRef.current.scrollTo({
      left: clamped * (cardWidth + GAP),
      behavior: "smooth",
    })
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

      {/* Outer wrapper — position:relative anchor for the nav buttons so they
          sit OUTSIDE the masked div and are never faded by maskImage. */}
      <div className="relative" style={{ paddingTop: 8 }}>

        {/* Prev / Next — outside the masked div so mask never clips them */}
        {currentIndex > 0 && <NavBtn dir="prev" onClick={() => scrollTo(currentIndex - 1)} />}
        {currentIndex < games.length - 1 && <NavBtn dir="next" onClick={() => scrollTo(currentIndex + 1)} />}

        {/* Masked carousel — overflow:hidden + edge fade, does NOT contain nav btns */}
        <div
          className="overflow-hidden"
          style={{
            maskImage:        "linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%)",
            WebkitMaskImage:  "linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%)",
          }}
        >

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
                background: i === currentIndex ? "#3452E5" : "rgba(255,255,255,0.18)",
              }}
              transition={{ duration: 0.22 }}
              style={{ height: 6, borderRadius: 3, flexShrink: 0 }}
            />
          ))}
        </div>
        </div> {/* end masked carousel */}
      </div>   {/* end outer wrapper */}
    </motion.section>
  )
}
