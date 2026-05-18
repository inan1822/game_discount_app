"use client"

import { useState, useEffect, useRef } from "react"
import { Search, X } from "lucide-react"
import Fuse from "fuse.js"
import { searchGames } from "@/lib/api/games"
import GameCard from "@/components/game/GameCard"
import BottomNav from "@/components/layout/BottomNav"
import type { Game } from "@/types/game"

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
  const [query,   setQuery]   = useState("")
  const [results, setResults] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef   = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setSearched(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      handleSearch(query)
    }, 500)
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
          // Fuse found high-confidence matches — use Fuse order for those,
          // then append anything Fuse didn't rank (score too low / unmatched).
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

      // Fall back to RAWG's native ordering when Fuse isn't confident
      setResults(data)
      setSearched(true)
    } catch {
      setResults([])
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative pb-24 min-h-screen">
      <div className="blob-blue w-48 h-48 top-0 -right-16" />

      {/* Header */}
      <header className="relative z-10 px-5 pt-12 pb-4">
        <h1 className="text-xl font-bold text-white mb-4">Search Games</h1>
        <div className="glass rounded-full px-4 py-3 flex items-center gap-3">
          <Search size={18} className="text-[#9fa0a1] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search games..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder-[#9fa0a1] outline-none text-sm"
          />
          {query && (
            <button onClick={() => setQuery("")}>
              <X size={16} className="text-[#9fa0a1] hover:text-white" />
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10 px-5">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-[20px] bg-[#1c1e2a] animate-pulse" style={{ height: 250 }} />
            ))}
          </div>
        ) : searched && results.length === 0 ? (
          <div className="text-center py-16 text-[#9fa0a1] text-sm">
            No games found for &quot;{query}&quot;
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {results.map(game => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-[#9fa0a1] text-sm">
            Type to search for games
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
