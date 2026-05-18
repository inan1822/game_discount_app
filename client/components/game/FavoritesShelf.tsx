"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import type { Game } from "@/types/game"
import { StarButton, formatPrice } from "./GameCard"
import { TiltCard } from "@/components/ui/TiltCard"
import { SectionHeading } from "@/components/ui/SectionHeading"

function FavCard({
  game, rank, price, isFavorited, onToggleFavorite, index,
}: {
  game:             Game
  rank:             number
  price:            string | undefined
  isFavorited:      boolean
  onToggleFavorite: (e: React.MouseEvent) => void
  index:            number
}) {
  const router       = useRouter()
  const priceDisplay = formatPrice(price)

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
            <img src={game.cover} alt={game.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#1c2533,#22182e)" }} />
          )}

          {/* Bottom gradient */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 55%)" }} />

          {/* Star */}
          <StarButton isFavorited={isFavorited} onToggle={onToggleFavorite} />

          {/* Rank dot */}
          <div className="absolute top-3 left-3 flex items-center justify-center font-bold text-[11px] text-white"
            style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(174,59,214,0.90)", boxShadow: "0 2px 8px rgba(174,59,214,0.5)" }}>
            {rank}
          </div>

          {/* Info */}
          <div className="absolute bottom-0 left-0 right-0 px-4 py-3"
            style={{ background: "rgba(28,30,42,0.75)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-white font-semibold text-[13px] leading-tight truncate flex-1">{game.name}</p>
              {game.rating > 0 && (
                <p className="text-[#AE3BD6] text-[11px] font-bold flex-shrink-0">★ {game.rating.toFixed(1)}</p>
              )}
            </div>
            {priceDisplay && (
              <span className="font-bold text-[13px]" style={{
                color: priceDisplay === "Free"    ? "#48BCF9"
                     : priceDisplay === "Unknown" ? "rgba(255,255,255,0.30)"
                     : "#5BDE8A",
              }}>
                {priceDisplay}
              </span>
            )}
          </div>
        </div>
      </TiltCard>
    </motion.div>
  )
}

export default function FavoritesShelf({
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
        right={
          <span className="text-[11px] font-bold px-2 py-0.5 mb-2" style={{
            background: "rgba(174,59,214,0.18)", color: "#AE3BD6",
            borderRadius: 6, border: "1px solid rgba(174,59,214,0.30)",
          }}>
            {games.length} saved
          </span>
        }
      />

      {/* Outer div handles horizontal scroll only */}
      <div style={{ overflowX: "auto", overflowY: "visible", scrollbarWidth: "none" }}>
        {/* Inner flex is overflow:visible so scale hover isn't clipped */}
        <div className="flex" style={{ gap: 36, paddingTop: 20, paddingBottom: 20, paddingLeft: 4, paddingRight: 4 }}>
          {games.map((game, i) => (
            <FavCard
              key={game.id}
              game={game}
              rank={i + 1}
              price={prices[game.id]}
              isFavorited={wishlistIds.has(String(game.id))}
              onToggleFavorite={(e) => { e.stopPropagation(); onToggleFavorite(e, game) }}
              index={i}
            />
          ))}
        </div>
      </div>
    </motion.section>
  )
}
