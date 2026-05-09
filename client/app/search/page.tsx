"use client"

import { useState, useEffect, useRef } from "react"
import { Search, X } from "lucide-react"
import { searchGames } from "@/lib/api/games"
import GameCard from "@/components/game/GameCard"
import BottomNav from "@/components/layout/BottomNav"
import type { Game } from "@/types/game"

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
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
      setResults(data)
      setSearched(true)
    } catch {
      setResults([])
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
