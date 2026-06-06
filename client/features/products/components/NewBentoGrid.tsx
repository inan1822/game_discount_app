"use client"

import { motion } from "framer-motion"
import type { Game } from "@/shared/types/game"
import GameCard from "./GameCard"
import { SectionHeading } from "@/shared/components/SectionHeading"

// ─── NewBentoGrid ─────────────────────────────────────────────────────────────
// "New" section — same card design as Trended (image on top, 16:9, frosted
// description below). Layout: 1 big hero on top + 4 smaller cards in a row.

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

  const g   = games.slice(0, 5)   // 1 big + 4 small
  const fav = (game: Game) => wishlistIds.has(String(game.id))

  return (
    <motion.section
      data-section="New"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      style={{ overflow: "visible" }}
    >
      <SectionHeading title="New" onSeeAll={onSeeAll} delay={delay} />

      {/* ── Bento grid: hero left (50%) + 2×2 small cards right (50%) ── */}
      <div className="px-3 grid grid-cols-1 sm:grid-cols-2" style={{ gap: 36 }}>

        {/* Hero — fills the full height of the right 2×2 column */}
        {g[0] && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.45, ease: "easeOut" }}
            style={{ minWidth: 0, height: "100%" }}
          >
            <GameCard
              game={g[0]}
              rank={1}
              isFavorited={fav(g[0])}
              onToggleFavorite={(e) => onToggleFavorite(e, g[0])}
              imageSize={{ w: "100%" }}
              stretchImage
              fillParentHeight
            />
          </motion.div>
        )}

        {/* 2×2 small cards */}
        <div className="grid grid-cols-2" style={{ gap: 36, minWidth: 0 }}>
          {g.slice(1, 5).map((game, i) => (
            <motion.div key={game.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delay + (i + 1) * 0.05, duration: 0.45, ease: "easeOut" }}
              style={{ minWidth: 0 }}
            >
              <GameCard
                game={game}
                rank={i + 2}
                isFavorited={fav(game)}
                onToggleFavorite={(e) => onToggleFavorite(e, game)}
                imageSize={{ w: "100%", aspectRatio: "16/9" }}
                stretchImage
              />
            </motion.div>
          ))}
        </div>

      </div>
    </motion.section>
  )
}
