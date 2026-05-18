"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import type { Game } from "@/types/game"
import { RankBadge, StarButton, formatPrice } from "./GameCard"
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

// ─── Big card (left column, full height) ──────────────────────────────────────

function BigCard({
  game, rank, price, isFavorited, onToggleFavorite,
}: CardProps) {
  const router       = useRouter()
  const priceDisplay = formatPrice(price)
  const platforms    = [...new Set(game.platforms.map(platformLabel))].slice(0, 3)

  return (
    <TiltCard
      tiltLimit={8}
      scale={1.02}
      spotlight
      style={{ borderRadius: 14, cursor: "pointer", height: "100%" }}
      onClick={() => router.push(`/game/${game.id}`)}
    >
      <div className="relative w-full h-full overflow-hidden" style={{ borderRadius: 14 }}>
        <RankBadge rank={rank} />
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
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-white font-bold text-[17px] leading-tight line-clamp-2 flex-1">{game.name}</p>
            {game.rating > 0 && (
              <p className="text-[#AE3BD6] text-[13px] font-bold flex-shrink-0">★ {game.rating.toFixed(1)}</p>
            )}
          </div>
          {game.genres.length > 0 && (
            <p className="text-[11px] mb-3 truncate" style={{ color: "rgba(255,255,255,0.45)" }}>
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
      </div>
    </TiltCard>
  )
}

// ─── Medium card (2×2 grid) ───────────────────────────────────────────────────

function MedCard({
  game, rank, price, isFavorited, onToggleFavorite,
}: CardProps) {
  const router       = useRouter()
  const priceDisplay = formatPrice(price)
  const platforms    = [...new Set(game.platforms.map(platformLabel))].slice(0, 2)

  return (
    <TiltCard
      tiltLimit={10}
      scale={1.03}
      spotlight
      style={{ borderRadius: 12, cursor: "pointer", height: "100%" }}
      onClick={() => router.push(`/game/${game.id}`)}
    >
      <div className="relative w-full h-full overflow-hidden" style={{ borderRadius: 12 }}>
        <RankBadge rank={rank} />
        <StarButton isFavorited={isFavorited} onToggle={onToggleFavorite} />

        {game.cover ? (
          <img src={game.cover} alt={game.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#1c2533,#22182e)" }} />
        )}

        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 55%)" }} />

        <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5"
          style={{ background: "rgba(28,30,42,0.72)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <p className="text-white font-semibold text-[12px] leading-tight truncate flex-1">{game.name}</p>
            {game.rating > 0 && (
              <p className="text-[#AE3BD6] text-[10px] font-bold flex-shrink-0">★ {game.rating.toFixed(1)}</p>
            )}
          </div>
          <div className="flex items-center justify-between gap-1">
            <div className="flex gap-1 flex-wrap">
              {platforms.map(p => (
                <span key={p} className="text-[9px] font-semibold px-1.5 py-0.5"
                  style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)", borderRadius: 4 }}>
                  {p}
                </span>
              ))}
            </div>
            {priceDisplay && (
              <span className="font-bold flex-shrink-0" style={{
                color:    priceDisplay === "Free"    ? "#48BCF9"
                        : priceDisplay === "Unknown" ? "rgba(255,255,255,0.30)"
                        : "#5BDE8A",
                fontSize: priceDisplay === "Unknown" ? 10 : 13,
              }}>
                {priceDisplay}
              </span>
            )}
          </div>
        </div>
      </div>
    </TiltCard>
  )
}

// ─── Small card (bottom row) ──────────────────────────────────────────────────

function SmallCard({
  game, rank, price, isFavorited, onToggleFavorite,
}: CardProps) {
  const router       = useRouter()
  const priceDisplay = formatPrice(price)

  return (
    <TiltCard
      tiltLimit={12}
      scale={1.04}
      spotlight
      style={{ borderRadius: 10, cursor: "pointer", height: "100%" }}
      onClick={() => router.push(`/game/${game.id}`)}
    >
      <div className="relative w-full h-full overflow-hidden" style={{ borderRadius: 10 }}>
        <RankBadge rank={rank} />
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
          {priceDisplay && (
            <span className="font-bold" style={{
              color:    priceDisplay === "Free"    ? "#48BCF9"
                      : priceDisplay === "Unknown" ? "rgba(255,255,255,0.30)"
                      : "#5BDE8A",
              fontSize: priceDisplay === "Unknown" ? 9 : 12,
            }}>
              {priceDisplay}
            </span>
          )}
        </div>
      </div>
    </TiltCard>
  )
}

// ─── Shared card props ────────────────────────────────────────────────────────

interface CardProps {
  game:             Game
  rank:             number
  price:            string | undefined
  isFavorited:      boolean
  onToggleFavorite: (e: React.MouseEvent) => void
}

// ─── NewBentoGrid ─────────────────────────────────────────────────────────────

export default function NewBentoGrid({
  games, prices, wishlistIds, onToggleFavorite, onSeeAll, delay = 0,
}: {
  games:            Game[]
  prices:           Record<number, string>
  wishlistIds:      Set<string>
  onToggleFavorite: (e: React.MouseEvent, game: Game) => void
  onSeeAll:         () => void
  delay?:           number
}) {
  if (games.length === 0) return null

  const cardProps = (game: Game, rank: number): CardProps => ({
    game,
    rank,
    price: prices[game.id],
    isFavorited: wishlistIds.has(String(game.id)),
    onToggleFavorite: (e) => { e.stopPropagation(); onToggleFavorite(e, game) },
  })

  // Slice up to 9 games
  const g = games.slice(0, 9)

  return (
    <motion.section
      data-section="New"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
    >
      <SectionHeading title="New" onSeeAll={onSeeAll} delay={delay} />

      <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>

        {/* ── Top bento: big card + 2×2 grid ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          rowGap: 36,
          columnGap: 36,
          height: 420,
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

        {/* ── Bottom row: 4 small cards ── */}
        {g.length > 5 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 36,
            height: 160,
          }}>
            {g.slice(5, 9).map((game, i) => (
              <SmallCard key={game.id} {...cardProps(game, i + 6)} />
            ))}
          </div>
        )}
      </div>
    </motion.section>
  )
}
