"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import type { Game } from "@/shared/types/game"
import { StarButton, deriveRating, ratingColor } from "./GameCard"
import { TiltCard } from "@/shared/components/TiltCard"
import { SectionHeading } from "@/shared/components/SectionHeading"
import ScrollableRow from "@/shared/components/ScrollableRow"
import { useCardPrice } from "@/features/products/utils/useCardPrice"

function FavCard({
  game, rank, isFavorited, onToggleFavorite, index,
}: {
  game:             Game
  rank:             number
  isFavorited:      boolean
  onToggleFavorite: (e: React.MouseEvent) => void
  index:            number
}) {
  const router  = useRouter()
  const price   = useCardPrice(game)
  const rating  = deriveRating(game)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: "easeOut" }}
      style={{ flexShrink: 0 }}
    >
      <TiltCard
        tiltLimit={12}
        scale={1.04}
        spotlight
        style={{ width: 380, height: 380, borderRadius: 14, cursor: "pointer" }}
        onClick={() => router.push(`/game/${game.id}`)}
      >
        <div className="relative w-full h-full overflow-hidden" style={{ borderRadius: 14 }}>

          {/* Cover */}
          {game.cover ? (
            <img src={game.cover} alt={game.name} loading="eager" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#1c2533,#22182e)" }} />
          )}

          {/* Bottom gradient */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 55%)" }} />

          {/* Star */}
          <StarButton isFavorited={isFavorited} onToggle={onToggleFavorite} />

          {/* Info */}
          <div className="absolute bottom-0 left-0 right-0 px-4 py-3"
            style={{ background: "rgba(28,30,42,0.75)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-white font-semibold text-[18px] leading-tight truncate flex-1">{game.name}</p>
              {rating && (
                <span className="text-[11px] font-bold flex-shrink-0 px-1.5 py-0.5"
                  style={{
                    background:    `${ratingColor(rating.pct)}22`,
                    color:         ratingColor(rating.pct),
                    borderRadius:  4,
                    letterSpacing: "-0.01em",
                  }}
                  title={rating.source === "mc" ? "Metacritic score" : "User score"}>
                  {rating.label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
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
                  fontSize: price != null && price !== undefined ? 18 : 13,
                }}>
                {price === undefined ? "···" : price === null ? "—" : price.isFree ? "Free" : `$${price.price.toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>
      </TiltCard>
    </motion.div>
  )
}

export default function FavoritesShelf({
  games, wishlistIds, onToggleFavorite, onSeeAll, delay = 0,
}: {
  games:            Game[]
  wishlistIds:      Set<string>
  onToggleFavorite: (e: React.MouseEvent, game: Game) => void
  onSeeAll:         () => void
  delay?:           number
}) {
  if (games.length === 0) return null

  return (
    <motion.section
      data-section="Favorites"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      style={{ overflow: "visible" }}
    >
      <SectionHeading
        title="Favorites"
        onSeeAll={onSeeAll}
        delay={delay}
      />

      <ScrollableRow gap={36} paddingTop={20} paddingBottom={20} paddingLeft={4} paddingRight={4}>
        {games.map((game, i) => (
          <FavCard
            key={game.id}
            game={game}
            rank={i + 1}
            isFavorited={wishlistIds.has(String(game.id))}
            onToggleFavorite={(e) => { e.stopPropagation(); onToggleFavorite(e, game) }}
            index={i}
          />
        ))}
      </ScrollableRow>
    </motion.section>
  )
}
