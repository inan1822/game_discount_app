"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"
import type { Game } from "@/types/game"
import GameCard from "./GameCard"
import { getByGenreGames } from "@/lib/api/games"
import { SectionHeading } from "@/components/ui/SectionHeading"

const GENRES = [
  { label: "Action",    slug: "action"    },
  { label: "RPG",       slug: "role-playing-games-rpg" },
  { label: "Strategy",  slug: "strategy"  },
  { label: "Adventure", slug: "adventure" },
  { label: "Shooter",   slug: "shooter"   },
  { label: "Indie",     slug: "indie"     },
]

export default function ByGenre({
  wishlistIds, onToggleFavorite, delay = 0, enabled = false,
}: {
  wishlistIds:      Set<string>
  onToggleFavorite: (e: React.MouseEvent, game: Game) => void
  delay?:           number
  enabled?:         boolean
}) {
  const [activeIdx, setActiveIdx]   = useState(0)
  const [games, setGames]           = useState<Game[]>([])
  const [loading, setLoading]       = useState(false)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setLoading(true)
    setGames([])
    getByGenreGames(GENRES[activeIdx].slug).then(result => {
      if (!cancelled) { setGames(result); setLoading(false) }
    }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [activeIdx, enabled])

  return (
    <motion.section
      data-section="By Genre"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
    >
      {/* Header + tabs */}
      <SectionHeading
        title="By Genre"
        delay={delay}
        right={
          <div className="flex gap-2 flex-wrap mb-2">
            {GENRES.map((g, i) => (
              <motion.button
                key={g.slug}
                onClick={() => setActiveIdx(i)}
                whileTap={{ scale: 0.95 }}
                className="text-[11px] font-semibold px-3 py-1.5"
                style={{
                  borderRadius: 8,
                  background:   i === activeIdx ? "#AE3BD6"           : "rgba(255,255,255,0.06)",
                  color:        i === activeIdx ? "#fff"               : "rgba(255,255,255,0.45)",
                  border:       i === activeIdx ? "1px solid #AE3BD6" : "1px solid rgba(255,255,255,0.08)",
                  transition:   "all 0.18s ease",
                }}
              >
                {g.label}
              </motion.button>
            ))}
          </div>
        }
      />

      {/* Cards */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex gap-[36px] overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex-shrink-0" style={{
                width: 280, height: 380, borderRadius: 10,
                background: "rgba(255,255,255,0.05)",
                animation: "pulse 1.5s ease-in-out infinite",
              }} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key={GENRES[activeIdx].slug}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="flex gap-[36px] overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}
          >
            {games.map((game, i) => (
              <motion.div key={game.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.35 }}>
                <GameCard
                  game={game}
                  rank={i + 1}
                  isFavorited={wishlistIds.has(String(game.id))}
                  onToggleFavorite={e => onToggleFavorite(e, game)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
