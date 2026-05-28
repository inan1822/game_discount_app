"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import type { Game } from "@/types/game"
import { StarButton } from "./GameCard"
import { useCardPrice } from "@/hooks/useCardPrice"
import { TiltCard } from "@/components/ui/TiltCard"
import { SectionHeading } from "@/components/ui/SectionHeading"

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

// ─── Shared card props (no price — fetched by hook inside each card) ──────────

interface CardProps {
  game:             Game
  rank:             number
  isFavorited:      boolean
  onToggleFavorite: (e: React.MouseEvent) => void
}

// ─── Big card (left column, full height) ──────────────────────────────────────

function BigCard({ game, rank, isFavorited, onToggleFavorite }: CardProps) {
  const router    = useRouter()
  const price     = useCardPrice(game)
  const platforms = [...new Set(game.platforms.map(platformLabel))].slice(0, 3)

  return (
    <TiltCard
      tiltLimit={8}
      scale={1.02}
      spotlight
      style={{ borderRadius: 14, cursor: "pointer", height: "100%" }}
      onClick={() => router.push(`/game/${game.id}`)}
    >
      <div className="relative w-full h-full overflow-hidden" style={{ borderRadius: 14 }}>
        <StarButton isFavorited={isFavorited} onToggle={onToggleFavorite} />

        {game.cover ? (
          <img src={game.cover} alt={game.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#1c2533,#22182e)" }} />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.10) 55%, transparent 100%)" }} />

        {/* Info */}
        <div className="absolute bottom-0 left-0 right-0 px-4 py-4">
          <p className="text-white font-bold text-[18px] leading-tight line-clamp-2 mb-1">{game.name}</p>
          {game.genres.length > 0 && (
            <p className="text-[12px] mb-3 truncate" style={{ color: "rgba(255,255,255,0.50)" }}>
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
                <span className="font-bold text-[11px] px-1.5 py-0.5"
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
                  fontSize: price != null && price !== undefined ? 16 : 12,
                }}>
                {price === undefined ? "···" : price === null ? "—" : price.isFree ? "Free" : `$${price.price.toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </TiltCard>
  )
}

// ─── Medium card (2×2 grid) ───────────────────────────────────────────────────

function MedCard({ game, rank, isFavorited, onToggleFavorite }: CardProps) {
  const router    = useRouter()
  const price     = useCardPrice(game)
  const platforms = [...new Set(game.platforms.map(platformLabel))].slice(0, 2)

  return (
    <TiltCard
      tiltLimit={10}
      scale={1.03}
      spotlight
      style={{ borderRadius: 12, cursor: "pointer", height: "100%" }}
      onClick={() => router.push(`/game/${game.id}`)}
    >
      <div className="relative w-full h-full overflow-hidden" style={{ borderRadius: 12 }}>
        <StarButton isFavorited={isFavorited} onToggle={onToggleFavorite} />

        {game.cover ? (
          <img src={game.cover} alt={game.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#1c2533,#22182e)" }} />
        )}

        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 55%)" }} />

        <div className="absolute bottom-0 left-0 right-0 px-3 py-3"
          style={{ background: "rgba(28,30,42,0.78)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
          <p className="text-white font-bold text-[13px] leading-tight truncate mb-1">{game.name}</p>
          <div className="flex items-center justify-between gap-1">
            <div className="flex gap-1 flex-wrap">
              {platforms.map(p => (
                <span key={p} className="text-[10px] font-semibold px-1.5 py-0.5"
                  style={{ background: "rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.60)", borderRadius: 4 }}>
                  {p}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {price && price.cut > 0 && (
                <span className="font-bold text-[10px] px-1 py-0.5"
                  style={{ background: "rgba(68,214,44,0.15)", color: "#44d62c", borderRadius: 3 }}>
                  -{price.cut}%
                </span>
              )}
              <span className="font-bold"
                style={{
                  color:    price === undefined ? "rgba(255,255,255,0.18)"
                          : price === null      ? "rgba(255,255,255,0.30)"
                          : price.isFree        ? "#48BCF9"
                          : "#5BDE8A",
                  fontSize: price != null && price !== undefined ? 13 : 10,
                }}>
                {price === undefined ? "···" : price === null ? "—" : price.isFree ? "Free" : `$${price.price.toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </TiltCard>
  )
}

// ─── Small card (bottom row) ──────────────────────────────────────────────────

function SmallCard({ game, rank, isFavorited, onToggleFavorite }: CardProps) {
  const router = useRouter()
  const price  = useCardPrice(game)

  return (
    <TiltCard
      tiltLimit={12}
      scale={1.04}
      spotlight
      style={{ borderRadius: 10, cursor: "pointer", height: "100%" }}
      onClick={() => router.push(`/game/${game.id}`)}
    >
      <div className="relative w-full h-full overflow-hidden" style={{ borderRadius: 10 }}>
        <StarButton isFavorited={isFavorited} onToggle={onToggleFavorite} />

        {game.cover ? (
          <img src={game.cover} alt={game.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#1c2533,#22182e)" }} />
        )}

        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 60%)" }} />

        <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2"
          style={{ background: "rgba(28,30,42,0.75)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
          <p className="text-white font-semibold text-[11px] leading-tight truncate mb-0.5">{game.name}</p>
          <div className="flex items-center gap-1">
            {price && price.cut > 0 && (
              <span className="font-bold text-[9px] px-1 py-0.5"
                style={{ background: "rgba(68,214,44,0.15)", color: "#44d62c", borderRadius: 3 }}>
                -{price.cut}%
              </span>
            )}
            <span className="font-bold"
              style={{
                color:    price === undefined ? "rgba(255,255,255,0.18)"
                        : price === null      ? "rgba(255,255,255,0.30)"
                        : price.isFree        ? "#48BCF9"
                        : "#5BDE8A",
                fontSize: price != null && price !== undefined ? 12 : 9,
              }}>
              {price === undefined ? "···" : price === null ? "—" : price.isFree ? "Free" : `$${price.price.toFixed(2)}`}
            </span>
          </div>
        </div>
      </div>
    </TiltCard>
  )
}

// ─── NewBentoGrid ─────────────────────────────────────────────────────────────

export default function NewBentoGrid({
  games, wishlistIds, onToggleFavorite, onSeeAll, delay = 0,
}: {
  games:            Game[]
  wishlistIds:      Set<string>
  onToggleFavorite: (e: React.MouseEvent, game: Game) => void
  onSeeAll:         () => void
  delay?:           number
}) {
  if (games.length === 0) return null

  const cardProps = (game: Game, rank: number): CardProps => ({
    game,
    rank,
    isFavorited: wishlistIds.has(String(game.id)),
    onToggleFavorite: (e) => { e.stopPropagation(); onToggleFavorite(e, game) },
  })

  // Top 5 only — big card + 2×2 grid. Bottom small-card row removed.
  const g = games.slice(0, 5)

  return (
    <motion.section
      data-section="New"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      style={{ overflow: "visible" }}
    >
      <SectionHeading title="New" onSeeAll={onSeeAll} delay={delay} />

      <div style={{ display: "flex", flexDirection: "column", gap: 36, overflow: "visible" }}>

        {/* ── Top bento: big card + 2×2 grid ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          rowGap: 36,
          columnGap: 36,
          height: 420,
          overflow: "visible",
          padding: 8,
          margin: -8,
        }}>
          {/* Card 1 — big, spans 2 rows */}
          {g[0] && (
            <div style={{ gridRow: "1 / 3" }}>
              <BigCard {...cardProps(g[0], 1)} />
            </div>
          )}
          {/* Cards 2–5 — 2×2 */}
          {g.slice(1, 5).map((game, i) => (
            <MedCard key={game.id} {...cardProps(game, i + 2)} />
          ))}
        </div>
      </div>
    </motion.section>
  )
}
