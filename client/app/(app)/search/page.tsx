"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, X } from "@/shared/icons"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import Fuse from "fuse.js"
import { searchGames } from "@/features/products/services/games"
import { getWishlist, addToWishlist, removeFromWishlist } from "@/features/wishlist/services/wishlist"
import GameCard from "@/features/products/components/GameCard"
import { SectionHeading } from "@/shared/components/SectionHeading"
import { useAuth } from "@/features/auth/state/AuthContext"
import type { Game, WishlistItem } from "@/shared/types/game"

// Fuse.js options for re-ranking RAWG results by title relevance.
// RAWG returns results ranked by its own relevance model — Fuse re-sorts
// so the closest title match always floats to the top.
const FUSE_OPTS: Fuse.IFuseOptions<Game> = {
  keys:             [{ name: "name", weight: 1 }],
  threshold:        0.45,    // 0 = exact match only, 1 = match anything
  includeScore:     true,
  minMatchCharLength: 2,
  ignoreLocation:   true,    // don't penalise matches far from start of string
}

export default function SearchPage() {
  const router   = useRouter()
  const { user } = useAuth()
  const isLoggedIn = !!user

  const [query,      setQuery]      = useState("")
  const [results,    setResults]    = useState<Game[]>([])
  const [loading,    setLoading]    = useState(false)
  const [searched,   setSearched]   = useState(false)
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set())

  const inputRef    = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!isLoggedIn) return
    getWishlist()
      .then((items) => setWishlistIds(new Set((items as WishlistItem[]).map(w => w.gameId))))
      .catch(() => {})
  }, [isLoggedIn])

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([])
      setSearched(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { handleSearch(query) }, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const handleSearch = async (q: string) => {
    setLoading(true)
    try {
      const data = await searchGames(q)

      // Re-rank: use Fuse.js to float the best title match to the top.
      // RAWG's search is good but sometimes buries the exact match.
      // Only re-rank when Fuse finds confident matches (score < 0.3).
      if (data.length > 1) {
        const fuse   = new Fuse(data, FUSE_OPTS)
        const ranked = fuse.search(q)
        if (ranked.length > 0 && (ranked[0].score ?? 1) < 0.3) {
          const rankedIds = new Set(ranked.map(r => r.item.id))
          const reordered = [
            ...ranked.map(r => r.item),
            ...data.filter(g => !rankedIds.has(g.id)),
          ]
          setResults(reordered)
          setSearched(true)
          return
        }
      }

      setResults(data)
      setSearched(true)
    } catch {
      setResults([])
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleFavorite = useCallback(async (e: React.MouseEvent, game: Game) => {
    e.stopPropagation()
    if (!isLoggedIn) { router.push("/login"); return }
    const id = String(game.id)
    const had = wishlistIds.has(id)
    setWishlistIds(prev => { const n = new Set(prev); had ? n.delete(id) : n.add(id); return n })
    try {
      if (had) await removeFromWishlist(id)
      else await addToWishlist({ gameId: id, gameName: game.name, gameCover: game.cover, gameSlug: game.slug })
    } catch {
      setWishlistIds(prev => { const n = new Set(prev); had ? n.add(id) : n.delete(id); return n })
    }
  }, [isLoggedIn, wishlistIds, router])

  const clearSearch = () => { setQuery(""); setResults([]); setSearched(false) }

  return (
    <div
      style={{
        width:        "min(calc(100% - 192px), 1600px)",
        marginInline: "auto",
        paddingBlock: 40,
      }}
    >
      <SectionHeading title="Search" />

      {/* Search input */}
      <div
        className="flex items-center gap-3 mb-8 px-4 py-3"
        style={{
          background:           "rgba(30,38,51,0.50)",
          border:               "1px solid #1F2439",
          borderRadius:         10,
          backdropFilter:       "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      >
        <Search size={18} style={{ color: "#9fa0a1", flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search games..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            flex:       1,
            background: "transparent",
            border:     "none",
            outline:    "none",
            color:      "#fff",
            fontSize:   16,
          }}
        />
        {query && (
          <button onClick={clearSearch} style={{ background: "none", border: "none", cursor: "pointer", color: "#9fa0a1" }}>
            <X size={16} />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex gap-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex-shrink-0 animate-pulse"
                style={{ width: 220, height: 308, background: "rgba(255,255,255,0.05)", borderRadius: 10 }} />
            ))}
          </motion.div>
        ) : searched && results.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center justify-center py-16"
            style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px dashed rgba(255,255,255,0.08)" }}>
            <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.3)" }}>
              No games found for &ldquo;{query}&rdquo;
            </p>
          </motion.div>
        ) : results.length > 0 ? (
          <motion.section key="results" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-[15px]">
                Search results for{" "}
                <span style={{ color: "#48BCF9" }}>&ldquo;{query}&rdquo;</span>
              </h2>
              <motion.button onClick={clearSearch}
                whileHover={{ x: 2, color: "rgba(255,255,255,0.8)" }} whileTap={{ scale: 0.97 }}
                className="text-[11px] flex items-center gap-1"
                style={{ color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer" }}>
                <X size={11} /> Clear
              </motion.button>
            </div>
            <div className="flex flex-wrap gap-5">
              {results.map((game, i) => (
                <motion.div key={game.id}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.4, ease: "easeOut" }}>
                  <GameCard
                    game={game}
                    isFavorited={wishlistIds.has(String(game.id))}
                    onToggleFavorite={e => handleToggleFavorite(e, game)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.section>
        ) : (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center justify-center py-16"
            style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px dashed rgba(255,255,255,0.08)" }}>
            <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.3)" }}>
              Type to search for games
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
