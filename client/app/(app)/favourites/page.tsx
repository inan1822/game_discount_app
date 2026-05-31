"use client"

import { useRouter } from "next/navigation"
import { useState, useRef, useMemo, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useWishlist } from "@/context/WishlistContext"
import { useCardPrice } from "@/hooks/useCardPrice"
import { getGameById } from "@/lib/api/games"
import { SectionHeading } from "@/components/ui/SectionHeading"
import type { WishlistItem, Game } from "@/types/game"

/** Same normaliser as GameCard — short muted platform labels */
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

const STAR_PTS = "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"

type UndoState = { item: WishlistItem; progress: number }

function FavouriteRow({
  item,
  onOpen,
  onRemove,
}: {
  item:     WishlistItem
  onOpen:   () => void
  onRemove: () => void
}) {
  const [fullGame, setFullGame] = useState<Game | null>(null)

  // Fetch full RAWG detail to get platforms + steamAppId (better ITAD lookup)
  useEffect(() => {
    getGameById(item.gameId)
      .then(g => setFullGame(g))
      .catch(() => {})
  }, [item.gameId])

  // Enrich the game shape as detail arrives — hook is stable on id
  const game = useMemo<Game>(() => ({
    id:         Number(item.gameId),
    slug:       item.gameSlug,
    name:       item.gameName,
    cover:      item.gameCover,
    rating:     fullGame?.rating     ?? 0,
    genres:     fullGame?.genres     ?? [],
    platforms:  fullGame?.platforms  ?? [],
    released:   fullGame?.released   ?? "",
    metacritic: fullGame?.metacritic ?? null,
    steamAppId: fullGame?.steamAppId,
  }), [item.gameId, item.gameName, item.gameCover, item.gameSlug, fullGame])

  const price    = useCardPrice(game)
  const platforms = fullGame
    ? [...new Set((fullGame.platforms as string[])
        .filter((p): p is string => typeof p === "string")
        .map(platformLabel))].slice(0, 4)
    : []

  return (
    <div
      className="relative flex items-center gap-3 cursor-pointer transition-all hover:border-[#6475D1]/40"
      style={{
        background:           "rgba(28,30,42,0.70)",
        backdropFilter:       "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border:               "1px solid rgba(31,37,57,0.6)",
        borderRadius:         10,
        padding:              "12px 16px",
      }}
      onClick={onOpen}
    >
      {/* Cover thumbnail */}
      <div
        className="flex-shrink-0 overflow-hidden"
        style={{ width: 200, height: 113, borderRadius: 10, background: "#2a2d32" }}
      >
        {item.gameCover ? (
          <img
            src={item.gameCover}
            alt={item.gameName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-[13px]"
            style={{ color: "#9fa0a1" }}
          >
            {item.gameName.charAt(0)}
          </div>
        )}
      </div>

      {/* Title + platforms + price */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate" style={{ color: "white", fontSize: 18 }}>
          {item.gameName}
        </p>

        {/* Platform pills — muted color, never brand colors (design rule #14) */}
        {platforms.length > 0 && (
          <div className="flex gap-1.5 flex-wrap" style={{ marginTop: 6 }}>
            {platforms.map(p => (
              <span
                key={p}
                style={{
                  background:   "rgba(255,255,255,0.08)",
                  color:        "rgba(255,255,255,0.55)",
                  borderRadius: 5,
                  fontSize:     12,
                  fontWeight:   500,
                  padding:      "2px 8px",
                }}
              >
                {p}
              </span>
            ))}
          </div>
        )}

        {/* Lowest available price — 4-state Card Display Spec (orchestrator rule) */}
        <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
          {price && price.cut > 0 && (
            <span
              style={{
                background:   "rgba(68,214,44,0.12)",
                color:        "#44d62c",
                borderRadius: 4,
                fontSize:     12,
                fontWeight:   700,
                padding:      "1px 6px",
              }}
            >
              -{price.cut}%
            </span>
          )}
          {price && price.cut > 0 && (
            <span style={{ color: "#9fa0a1", fontSize: 12, textDecoration: "line-through" }}>
              ${price.regular.toFixed(2)}
            </span>
          )}
          <span
            style={{
              fontWeight: 700,
              fontSize:   16,
              color:      price === undefined ? "rgba(255,255,255,0.18)"
                        : price === null      ? "rgba(255,255,255,0.30)"
                        : price.isFree        ? "#48BCF9"
                        : "#5BDE8A",
            }}
          >
            {price === undefined ? "···"
             : price === null    ? "Unknown"
             : price.isFree      ? "Free"
             : `$${price.price.toFixed(2)}`}
          </span>
        </div>
      </div>

      {/* Star remove button */}
      <button
        onClick={e => { e.stopPropagation(); onRemove() }}
        className="w-8 h-8 flex items-center justify-center relative"
        style={{ position: "absolute", top: 10, right: 12 }}
        aria-label="Remove from favourites"
      >
        <svg
          width="18" height="18" viewBox="0 0 24 24"
          fill="#49BCF9" aria-hidden
          style={{ position: "absolute", filter: "blur(6px)", opacity: 0.70, pointerEvents: "none" }}
        >
          <polygon points={STAR_PTS} />
        </svg>
        <svg
          width="16" height="16" viewBox="0 0 24 24"
          fill="#48BCF9" stroke="#48BCF9"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ position: "relative" }}
        >
          <polygon points={STAR_PTS} />
        </svg>
      </button>
    </div>
  )
}

export default function WishlistPage() {
  const router = useRouter()
  const { items, toggle, isLoading } = useWishlist()

  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [undoState, setUndoState]   = useState<UndoState | null>(null)
  const timeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function clearTimers() {
    if (timeoutRef.current)  clearTimeout(timeoutRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  // Clear timers on unmount so setState is never called on an unmounted component.
  useEffect(() => () => clearTimers(), [])

  function confirmRemoval(item: WishlistItem) {
    toggle({ id: parseInt(item.gameId), name: item.gameName, cover: item.gameCover, slug: item.gameSlug })
  }

  function handleRemove(item: WishlistItem) {
    // Confirm any already-pending removal first
    if (undoState) {
      clearTimers()
      confirmRemoval(undoState.item)
    }

    // Optimistically hide
    setPendingIds(prev => new Set([...prev, item._id]))
    setUndoState({ item, progress: 100 })

    let elapsed = 0
    intervalRef.current = setInterval(() => {
      elapsed += 100
      setUndoState(s => s ? { ...s, progress: Math.max(0, 100 - (elapsed / 6000) * 100) } : null)
    }, 100)

    timeoutRef.current = setTimeout(() => {
      clearInterval(intervalRef.current!)
      setUndoState(null)
      setPendingIds(prev => { const n = new Set(prev); n.delete(item._id); return n })
      confirmRemoval(item)
    }, 6000)
  }

  function handleUndo() {
    if (!undoState) return
    clearTimers()
    setPendingIds(prev => { const n = new Set(prev); n.delete(undoState.item._id); return n })
    setUndoState(null)
  }

  const visibleItems = items.filter(i => !pendingIds.has(i._id))

  return (
    <div style={{ width: "min(calc(100% - 192px), 1600px)", marginInline: "auto", paddingBlock: 40 }}>
      <SectionHeading
        title="Favourites"
        right={
          <span className="text-[13px]" style={{ color: "#9fa0a1", marginBottom: 2 }}>
            {items.length} {items.length === 1 ? "game" : "games"}
          </span>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{ height: 113, borderRadius: 12, background: "rgba(28,30,42,0.50)" }}
            />
          ))}
        </div>
      ) : visibleItems.length === 0 && !undoState ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg
            width="48" height="48" viewBox="0 0 24 24"
            fill="none" stroke="rgba(255,255,255,0.08)"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="mb-4"
          >
            <polygon points={STAR_PTS} />
          </svg>
          <p className="text-[14px]" style={{ color: "#9fa0a1" }}>No games saved yet</p>
          <p className="text-[13px] mt-1" style={{ color: "#9fa0a1", opacity: 0.6 }}>
            Tap ★ on any game to add it here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleItems.map(item => (
            <FavouriteRow
              key={item._id}
              item={item}
              onOpen={() => router.push(`/game/${item.gameId}`)}
              onRemove={() => handleRemove(item)}
            />
          ))}
        </div>
      )}

      {/* Undo popup */}
      <AnimatePresence>
        {undoState && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            style={{
              position:             "fixed",
              bottom:               32,
              left:                 "50%",
              x:                    "-50%",
              zIndex:               50,
              background:           "rgba(28,30,42,0.95)",
              backdropFilter:       "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border:               "1px solid rgba(31,37,57,0.8)",
              borderRadius:         12,
              padding:              "12px 16px",
              minWidth:             280,
              boxShadow:            "0 8px 32px rgba(0,0,0,0.5)",
              display:              "flex",
              flexDirection:        "column",
              gap:                  10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <p style={{ color: "#b3bade", fontSize: 14, margin: 0 }}>
                Removed{" "}
                <span style={{ color: "white", fontWeight: 600 }}>
                  {undoState.item.gameName}
                </span>
              </p>
              <button
                onClick={handleUndo}
                style={{
                  color:        "#48BCF9",
                  fontSize:     13,
                  fontWeight:   700,
                  background:   "rgba(72,188,249,0.12)",
                  border:       "1px solid rgba(72,188,249,0.25)",
                  borderRadius: 6,
                  padding:      "4px 12px",
                  cursor:       "pointer",
                  whiteSpace:   "nowrap",
                  flexShrink:   0,
                }}
              >
                Undo
              </button>
            </div>

            {/* Progress bar drains over 6s */}
            <div style={{ height: 3, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <div
                style={{
                  height:       "100%",
                  width:        `${undoState.progress}%`,
                  background:   "#48BCF9",
                  borderRadius: 999,
                  transition:   "width 0.1s linear",
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
