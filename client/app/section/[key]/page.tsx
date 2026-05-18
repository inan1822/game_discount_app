"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  ArrowLeft, Home, BellRing, Search as SearchIcon,
  Users, User, LogIn, Bell,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { BackgroundGradientAnimation } from "@/components/ui/BackgroundGradientAnimation"
import GameCard from "@/components/game/GameCard"
import { getPopularGames, getNewGames, getTrendedGames, getForYouGames } from "@/lib/api/games"
import { getWishlist, addToWishlist, removeFromWishlist } from "@/lib/api/wishlist"
import type { Game, WishlistItem } from "@/types/game"

// ─── Section metadata ─────────────────────────────────────────────────────────
const SLUG_META: Record<string, { label: string; paginated: boolean }> = {
  popular:   { label: "Popular",   paginated: true  },
  new:       { label: "New",       paginated: true  },
  trended:   { label: "Trended",   paginated: true  },
  favorites: { label: "Favorites", paginated: false },
  "for-you": { label: "For you",   paginated: false },
}

const AUTH_SECTIONS = new Set(["favorites", "for-you"])
const AUTH_NAV      = new Set(["Notifications", "Friends", "Profile"])

const NAV = [
  { icon: Home,        label: "Home",          href: "/"              },
  { icon: BellRing,    label: "Notifications",  href: "/notifications" },
  { icon: SearchIcon,  label: "Search",         href: "/search"        },
  { icon: Users,       label: "Friends",        href: "/friends"       },
  { icon: User,        label: "Profile",        href: "/profile"       },
] as const

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

async function fetchCheapestPrice(title: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(title)}&limit=1`)
    if (!res.ok) return null
    const d = await res.json()
    return Array.isArray(d) && d[0]?.cheapest ? (d[0].cheapest as string) : null
  } catch { return null }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SectionPage() {
  const router           = useRouter()
  const params           = useParams()
  const { user, logout } = useAuth()
  const isLoggedIn       = !!user

  const slug      = (params?.key as string) ?? ""
  const meta      = SLUG_META[slug]
  const label     = meta?.label ?? slug
  const paginated = meta?.paginated ?? true

  const [activeNav,   setActiveNav]   = useState("Home")
  const [games,       setGames]       = useState<Game[]>([])
  const [prices,      setPrices]      = useState<Record<number, string>>({})
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
    const unseen = games.filter(g => !prices[g.id]).slice(0, 30)
    if (!unseen.length) return
    ;(async () => {
      for (let i = 0; i < unseen.length; i += 5) {
        const r = await Promise.all(
          unseen.slice(i, i + 5).map(g => fetchCheapestPrice(g.name).then(p => ({ id: g.id, price: p })))
        )
        setPrices(p => { const n = { ...p }; r.forEach(({ id, price }) => { if (price) n[id] = price }); return n })
        if (i + 5 < unseen.length) await new Promise(r => setTimeout(r, 300))
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

  const handleNavClick = (navLabel: string, href: string) => {
    if (!isLoggedIn && AUTH_NAV.has(navLabel)) { router.push("/login"); return }
    setActiveNav(navLabel); router.push(href)
  }

  const userInitial = user?.name?.charAt(0)?.toUpperCase() ?? "?"

  return (
    <main className="relative w-screen h-screen overflow-hidden" style={{ background: "#1E2532" }}>
      <BackgroundGradientAnimation />
      <img src="/icons/auth-bg-top.svg" aria-hidden
        className="absolute inset-0 w-full h-full pointer-events-none object-cover"
        style={{ zIndex: 2 }}
      />

      <div className="relative flex h-full" style={{ zIndex: 3 }}>

        {/* ══════════ SIDEBAR ══════════ */}
        <motion.aside
          initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="flex flex-col flex-shrink-0 h-full"
          style={{ width: 192, ...glassStyle, borderRight: "1px solid rgba(255,255,255,0.05)" }}
        >
          <motion.div {...fadeUp(0.05)} className="flex items-center gap-3 px-5 pt-6 pb-5">
            <img src="/icons/logo.svg" alt="" style={{ width: 30, height: 30 }} />
            <span className="text-white font-bold text-[17px] tracking-wide">DisLow</span>
          </motion.div>

          <div className="px-3 mb-1">
            <p className="text-[9px] font-bold tracking-[0.12em] px-3 mb-2"
              style={{ color: "rgba(255,255,255,0.25)" }}>MENU</p>
            {NAV.map(({ icon: Icon, label: navLabel, href }, i) => {
              const active = activeNav === navLabel
              const locked = !isLoggedIn && AUTH_NAV.has(navLabel)
              return (
                <motion.button key={navLabel} {...fadeUp(0.1 + i * 0.05, 8)}
                  onClick={() => handleNavClick(navLabel, href)}
                  whileHover={{ x: 3, backgroundColor: active ? "rgba(52,82,229,0.18)" : "rgba(255,255,255,0.04)" }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 mb-0.5 text-sm font-medium relative overflow-hidden"
                  style={{ borderRadius: 10, color: active ? "#48BCF9" : locked ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.45)", background: active ? "rgba(52,82,229,0.13)" : "transparent" }}
                >
                  {active && <motion.div layoutId="nav-indicator" className="absolute left-0 top-1/2 -translate-y-1/2"
                    style={{ width: 3, height: 20, background: "#48BCF9", borderRadius: "0 4px 4px 0" }} />}
                  <Icon size={15} /><span>{navLabel}</span>
                  {locked && <span className="ml-auto text-[8px] px-1 py-0.5 rounded"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.2)" }}>Login</span>}
                </motion.button>
              )
            })}
          </div>

          <div className="flex-1" />

          {isLoggedIn ? (
            <motion.button {...fadeUp(0.45)} onClick={logout}
              whileHover={{ x: 4, color: "#fff" }} whileTap={{ scale: 0.97 }}
              className="flex items-center gap-3 px-8 py-5 text-sm font-medium"
              style={{ color: "rgba(255,255,255,0.35)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF6B4A]" />log out
            </motion.button>
          ) : (
            <motion.button {...fadeUp(0.45)} onClick={() => router.push("/login")}
              whileHover={{ x: 4 }} whileTap={{ scale: 0.97 }}
              className="flex items-center gap-3 px-8 py-5 text-sm font-semibold"
              style={{ color: "#48BCF9", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <LogIn size={15} />Log in
            </motion.button>
          )}
        </motion.aside>

        {/* ══════════ MAIN ══════════ */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

          {/* HEADER */}
          <motion.header
            initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
            className="flex items-center gap-4 flex-shrink-0"
            style={{ height: 52, ...glassStyle, borderRadius: 12, margin: "12px 80px 0", position: "relative", zIndex: 100 }}
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
              <motion.div whileHover={{ scale: 1.15, rotate: 10 }} whileTap={{ scale: 0.9 }} className="relative cursor-pointer">
                <Bell size={16} style={{ color: "rgba(255,255,255,0.45)" }} />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#FF6B4A]" />
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
                  style={{ borderRadius: 8, background: "rgba(52,82,229,0.15)", color: "#48BCF9", border: "1px solid rgba(72,188,249,0.2)" }}>
                  Login
                </motion.button>
              )}
            </div>
          </motion.header>

          {/* CONTENT — grid layout, infinite scroll */}
          <div className="flex-1 overflow-y-auto pt-6 pb-8"
            style={{ scrollbarWidth: "none", paddingLeft: 80, paddingRight: 80 }}>

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
                        price={prices[game.id] ?? null}
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
                          style={{ width: 6, height: 6, borderRadius: "50%", background: "#48BCF9" }} />
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
      </div>
    </main>
  )
}
