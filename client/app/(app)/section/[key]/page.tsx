"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Bell } from "@/shared/icons"
import { useAuth } from "@/features/auth/state/AuthContext"
import GameCard from "@/features/products/components/GameCard"
import { getPopularGames, getNewGames, getTrendedGames, getForYouGames, getCardPrices } from "@/features/products/services/games"
import { getWishlist, addToWishlist, removeFromWishlist } from "@/features/wishlist/services/wishlist"
import type { Game, WishlistItem, CardPrice } from "@/shared/types/game"

// ─── Section metadata ─────────────────────────────────────────────────────────
const SLUG_META: Record<string, { label: string; paginated: boolean }> = {
  popular:   { label: "Popular",   paginated: true  },
  new:       { label: "New",       paginated: true  },
  trended:   { label: "Trended",   paginated: true  },
  favorites: { label: "Favorites", paginated: false },
  "for-you": { label: "For you",   paginated: false },
}

const AUTH_SECTIONS = new Set(["favorites", "for-you"])

const glassStyle = {
  background:           "rgba(30, 38, 51, 0.70)",
  backdropFilter:       "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
} as const

const fadeUp = (delay = 0, y = 20) => ({
  initial:    { opacity: 0, y },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut", delay },
})


// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SectionPage() {
  const router           = useRouter()
  const params           = useParams()
  const { user } = useAuth()
  const isLoggedIn       = !!user

  const slug      = (params?.key as string) ?? ""
  const meta      = SLUG_META[slug]
  const label     = meta?.label ?? slug
  const paginated = meta?.paginated ?? true

  const [games,       setGames]       = useState<Game[]>([])
  const [prices,      setPrices]      = useState<Record<number, CardPrice | null>>({})
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set())
  const [page,        setPage]        = useState(1)
  const [hasMore,     setHasMore]     = useState(paginated)
  const [loading,     setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const sentinelRef = useRef<HTMLDivElement>(null)

  // ── Fetch one page of the section ─────────────────────────────────────────
  const fetchSection = useCallback(async (p: number): Promise<Game[]> => {
    switch (slug) {
      case "popular":   return getPopularGames(p)
      case "new":       return getNewGames(p)
      case "trended":   return getTrendedGames(p)
      case "for-you":   return getForYouGames()
      case "favorites": {
        const items = (await getWishlist()) as WishlistItem[]
        setWishlistIds(new Set(items.map(w => w.gameId)))
        return items.map(w => ({
          id: Number(w.gameId), slug: w.gameSlug, name: w.gameName,
          cover: w.gameCover, rating: 0, genres: [], platforms: [], released: "", metacritic: null,
        }))
      }
      default: return []
    }
  }, [slug])

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (AUTH_SECTIONS.has(slug) && !isLoggedIn) { router.push("/login"); return }

    const init = async () => {
      setLoading(true)
      setGames([]); setPage(1); setHasMore(paginated)

      // Always load wishlist IDs for star state
      if (isLoggedIn && slug !== "favorites") {
        getWishlist().then(items =>
          setWishlistIds(new Set((items as WishlistItem[]).map(w => w.gameId)))
        ).catch(() => {})
      }

      try {
        const data = await fetchSection(1)
        setGames(data)
        // No more pages: non-paginated sections OR partial first page
        if (!paginated || data.length < 20) setHasMore(false)
      } catch (err) {
        console.error("Failed to load section:", err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [slug, isLoggedIn])

  // ── Infinite scroll — load next page ─────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return
    setLoadingMore(true)
    try {
      const next = page + 1
      const data = await fetchSection(next)
      if (data.length === 0) {
        setHasMore(false)
      } else {
        setGames(prev => {
          // Deduplicate by id (RAWG can return the same game across pages occasionally)
          const ids  = new Set(prev.map(g => g.id))
          const fresh = data.filter(g => !ids.has(g.id))
          return [...prev, ...fresh]
        })
        setPage(next)
        if (data.length < 20) setHasMore(false)
      }
    } catch { /* silent — user can scroll again */ }
    finally  { setLoadingMore(false) }
  }, [loadingMore, hasMore, loading, page, fetchSection])

  // ── Intersection observer ─────────────────────────────────────────────────
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore() },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadMore])

  // ── Price fetching (background, new games only) ───────────────────────────
  useEffect(() => {
    if (!games.length) return
    const unseen = games.filter(g => !(g.id in prices)).slice(0, 30)
    if (!unseen.length) return
    ;(async () => {
      for (let i = 0; i < unseen.length; i += 20) {
        const batch = unseen.slice(i, i + 20)
        const result = await getCardPrices(
          batch.map(g => ({ id: g.id, name: g.name, steamAppId: g.steamAppId }))
        )
        setPrices(p => ({ ...p, ...result }))
        if (i + 20 < unseen.length) await new Promise(r => setTimeout(r, 300))
      }
    })()
  }, [games.length])

  // ── Wishlist toggle ───────────────────────────────────────────────────────
  const handleToggleFavorite = useCallback(async (e: React.MouseEvent, game: Game) => {
    e.stopPropagation()
    if (!isLoggedIn) { router.push("/login"); return }
    const id = String(game.id); const had = wishlistIds.has(id)
    setWishlistIds(p => { const n = new Set(p); had ? n.delete(id) : n.add(id); return n })
    try {
      if (had) {
        await removeFromWishlist(id)
        if (slug === "favorites") setGames(p => p.filter(g => String(g.id) !== id))
      } else {
        await addToWishlist({ gameId: id, gameName: game.name, gameCover: game.cover, gameSlug: game.slug })
      }
    } catch {
      setWishlistIds(p => { const n = new Set(p); had ? n.add(id) : n.delete(id); return n })
    }
  }, [isLoggedIn, wishlistIds, router, slug])

  const userInitial = user?.name?.charAt(0)?.toUpperCase() ?? "?"

  return (
    // Shell (sidebar + background) provided by (app)/layout.tsx
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

          {/* HEADER */}
          <motion.header
            initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
            className="flex items-center gap-4 flex-shrink-0"
            style={{ height: 52, ...glassStyle, borderRadius: 12, margin: "12px 96px 0", position: "relative", zIndex: 100 }}
          >
            {/* Back */}
            <motion.button onClick={() => router.push("/")}
              whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}
              className="ml-4 flex items-center gap-1.5 text-[13px] font-medium"
              style={{ color: "rgba(255,255,255,0.5)" }}>
              <ArrowLeft size={15} />
              <span>Back</span>
            </motion.button>

            {/* Divider */}
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)" }} />

            {/* Section title */}
            <h1 className="text-white font-bold text-[15px] flex-1">{label}</h1>

            {/* Count badge */}
            {!loading && (
              <motion.span
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-[11px] font-semibold px-2 py-0.5"
                style={{ borderRadius: 6, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}>
                {games.length}{hasMore ? "+" : ""} games
              </motion.span>
            )}

            {/* Bell + Avatar */}
            <div className="flex items-center gap-3 mr-4">
              <motion.div whileHover={{ scale: 1.15, rotate: 10 }} whileTap={{ scale: 0.9 }} className="relative cursor-pointer" onClick={() => router.push("/notifications")}>
                <Bell size={16} style={{ color: "rgba(255,255,255,0.45)" }} />
              </motion.div>
              {isLoggedIn ? (
                <motion.div
                  whileHover={{ scale: 1.08, boxShadow: "0 0 12px rgba(174,59,214,0.5)" }} whileTap={{ scale: 0.95 }}
                  className="w-8 h-8 flex items-center justify-center text-sm font-bold text-white cursor-pointer"
                  style={{ borderRadius: 10, background: "linear-gradient(135deg, #AE3BD6, #6475D1)" }}
                  onClick={() => router.push("/profile")}>
                  {userInitial}
                </motion.div>
              ) : (
                <motion.button onClick={() => router.push("/login")}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                  className="text-[12px] font-semibold px-3 py-1"
                  style={{ borderRadius: 8, background: "rgba(100,117,209,0.15)", color: "#6475D1", border: "1px solid rgba(100,117,209,0.25)" }}>
                  Login
                </motion.button>
              )}
            </div>
          </motion.header>

          {/* CONTENT — grid layout, infinite scroll */}
          <div className="flex-1 overflow-y-auto pt-6 pb-8"
            style={{ scrollbarWidth: "none", paddingLeft: 96, paddingRight: 96 }}>

            {loading ? (
              /* Initial skeleton */
              <div className="grid gap-5"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                {[...Array(15)].map((_, i) => (
                  <div key={i} className="animate-pulse"
                    style={{ height: 308, background: "rgba(255,255,255,0.05)", borderRadius: 10 }} />
                ))}
              </div>
            ) : games.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24"
                style={{ color: "rgba(255,255,255,0.3)" }}>
                <p className="text-[14px]">No games found in this section.</p>
              </div>
            ) : (
              <>
                {/* Game grid */}
                <div className="grid gap-5"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                  {games.map((game, i) => (
                    <motion.div key={game.id}
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.025, 0.5), duration: 0.4, ease: "easeOut" }}>
                      <GameCard
                        game={game}
                        rank={i + 1}
                        isFavorited={wishlistIds.has(String(game.id))}
                        onToggleFavorite={e => handleToggleFavorite(e, game)}
                      />
                    </motion.div>
                  ))}

                  {/* Loading more skeletons — fill remaining grid cells visually */}
                  {loadingMore && [...Array(5)].map((_, i) => (
                    <div key={`sk-${i}`} className="animate-pulse"
                      style={{ height: 308, background: "rgba(255,255,255,0.04)", borderRadius: 10 }} />
                  ))}
                </div>

                {/* Sentinel + end-of-list indicator */}
                <div ref={sentinelRef} className="flex items-center justify-center mt-8 h-12">
                  {loadingMore && (
                    <div className="flex items-center gap-2">
                      {[0, 1, 2].map(i => (
                        <motion.div key={i}
                          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                          transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                          style={{ width: 6, height: 6, borderRadius: "50%", background: "#6475D1" }} />
                      ))}
                    </div>
                  )}
                  {!hasMore && !loadingMore && games.length > 0 && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                      All {games.length} games loaded ✓
                    </motion.p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
  )
}
