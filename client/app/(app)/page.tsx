"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useDebouncedCallback } from "use-debounce"
import { SlidersHorizontal, Search, Bell, Star, X } from "@/shared/icons"
import { useAuth } from "@/features/auth/state/AuthContext"
import { useChat } from "@/features/chat/state/ChatContext"
import GameCard from "@/features/products/components/GameCard"
import PopularCarousel from "@/features/products/components/PopularCarousel"
import NewBentoGrid from "@/features/products/components/NewBentoGrid"
import FavoritesShelf from "@/features/products/components/FavoritesShelf"
import { SectionHeading } from "@/shared/components/SectionHeading"
import ScrollableRow from "@/shared/components/ScrollableRow"
import {
  getPopularGames, getNewGames, getTrendedGames, getForYouGames, searchGames, getGameById,
  getFreeToPlayGames, getHiddenGemsGames, getCardPrices,
  getDisLowGames,
} from "@/features/products/services/games"
import { primeCache } from "@/features/products/utils/useCardPrice"
import { DualRangeSlider } from "@/shared/components/DualRangeSlider"
import { getWishlist, addToWishlist, removeFromWishlist } from "@/features/wishlist/services/wishlist"
import { useUnreadCount } from "@/features/chat/utils/useUnreadCount"
import NotificationPopover from "@/components/notifications/NotificationPopover"
import type { Game, WishlistItem, CardPrice } from "@/shared/types/game"

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_SECTIONS = [
  { label: "Popular",      key: "Popular",      authOnly: false },
  { label: "New",          key: "New",          authOnly: false },
  { label: "Favorites",    key: "Favorites",    authOnly: true  },
  { label: "For you",      key: "For you",      authOnly: true  },
  { label: "Trended",      key: "Trended",      authOnly: false },
  { label: "Free to Play", key: "Free to Play", authOnly: false },
  { label: "Hidden Gems",  key: "Hidden Gems",  authOnly: false },
  { label: "DisLow games", key: "DisLow games", authOnly: false },
] as const

// ─── Filters ─────────────────────────────────────────────────────────────────
const CURRENT_YEAR    = new Date().getFullYear()
const FILTER_STYLE    = ["All genres",    "Action",     "RPG",          "Adventure", "Shooter", "Strategy", "Indie"] as const
const FILTER_PLATFORM = ["All platforms", "PC",         "PS5",          "Xbox",      "Switch"] as const

interface Filters {
  dateRange:  [number, number]   // [startYear, endYear]
  priceRange: [number, number]   // [minPrice, maxPrice]
  genre:    string
  platform: string
}
const DEFAULT_FILTERS: Filters = {
  dateRange:  [1990, CURRENT_YEAR],
  priceRange: [0, 100],
  genre:      "All genres",
  platform:   "All platforms",
}

// ─── Styles / helpers ─────────────────────────────────────────────────────────
// Header glass — lighter opacity (50%) so the floating bar reads as glass,
// not as a solid strip.
const headerGlass = {
  background: "rgba(30, 38, 51, 0.50)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
} as const

// Beyond 16:9 (typical 1920×1080 and wider), cap the content column so
// cards don't stretch across an ultrawide screen — center it instead.
const CONTENT_MAX_WIDTH = 1600
const CONTENT_SIDE_PADDING = 96

const fadeUp = (delay = 0, y = 20) => ({
  initial:    { opacity: 0, y },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut", delay },
})

/** "For you" → "for-you",  "Popular" → "popular" */
function toSlug(key: string) { return key.toLowerCase().replace(/ /g, "-") }

function matchesPlatform(platforms: string[], target: string) {
  return platforms.some(p => {
    const l = p.toLowerCase()
    if (target === "PC")     return l.includes("pc") || l.includes("windows")
    if (target === "PS5")    return l.includes("playstation") || l.includes("ps5") || l.includes("ps4")
    if (target === "Xbox")   return l.includes("xbox")
    if (target === "Switch") return l.includes("nintendo")
    return false
  })
}

// ─── Filter Dropdown ──────────────────────────────────────────────────────────
function FilterDropdown({ filters, onChange, onClose, pos, popupRef }: {
  filters:   Filters
  onChange:  (f: Filters) => void
  onClose:   () => void
  pos:       { top: number; left: number }
  popupRef:  React.RefObject<HTMLDivElement>
}) {
  const setGenre    = (v: string)           => onChange({ ...filters, genre: v })
  const setPlatform = (v: string)           => onChange({ ...filters, platform: v })
  const setDate     = (v: [number, number]) => onChange({ ...filters, dateRange: v })
  const setPrice    = (v: [number, number]) => onChange({ ...filters, priceRange: v })

  const Pill = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
      className="text-[11px] font-medium px-2.5 py-1"
      style={{
        borderRadius: 7,
        background: active ? "rgba(52,82,229,0.28)" : "rgba(255,255,255,0.05)",
        color:       active ? "#49BCF9"              : "rgba(255,255,255,0.5)",
        border:      "none",
      }}
    >{label}</motion.button>
  )

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <p className="text-[9px] font-bold tracking-widest mb-2.5" style={{ color: "rgba(255,255,255,0.25)" }}>{title}</p>
      {children}
    </div>
  )

  const isDefault = (
    filters.genre    === DEFAULT_FILTERS.genre    &&
    filters.platform === DEFAULT_FILTERS.platform &&
    filters.dateRange[0]  === DEFAULT_FILTERS.dateRange[0]  &&
    filters.dateRange[1]  === DEFAULT_FILTERS.dateRange[1]  &&
    filters.priceRange[0] === DEFAULT_FILTERS.priceRange[0] &&
    filters.priceRange[1] === DEFAULT_FILTERS.priceRange[1]
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{    opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      ref={popupRef}
      className="flex flex-col gap-4 p-4"
      style={{
        position:             "fixed",
        top:                  pos.top,
        left:                 pos.left,
        zIndex:               9999,
        width:                320,
        background:           "rgba(38,44,53,0.70)",
        backdropFilter:       "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        borderRadius:         10,
        boxShadow:            "0 16px 48px rgba(0,0,0,0.6)",
        overflow:             "hidden",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-white text-[13px] font-bold">Filters</span>
        <div className="flex items-center gap-2">
          {!isDefault && (
            <motion.button onClick={() => onChange(DEFAULT_FILTERS)}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="text-[10px]" style={{ color: "#49BCF9" }}>Clear all</motion.button>
          )}
          <motion.button onClick={onClose}
            whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
            style={{ color: "rgba(255,255,255,0.4)" }}><X size={14} /></motion.button>
        </div>
      </div>

      {/* STYLE */}
      <div>
        <p className="text-[9px] font-bold tracking-widest mb-2.5" style={{ color: "rgba(255,255,255,0.25)" }}>STYLE</p>
        <div className="flex flex-wrap gap-1.5">
          {FILTER_STYLE.map(g => <Pill key={g} label={g} active={filters.genre === g} onClick={() => setGenre(g)} />)}
        </div>
      </div>

      {/* PLATFORM */}
      <div>
        <p className="text-[9px] font-bold tracking-widest mb-2.5" style={{ color: "rgba(255,255,255,0.25)" }}>PLATFORM</p>
        <div className="flex flex-wrap gap-1.5">
          {FILTER_PLATFORM.map(p => <Pill key={p} label={p} active={filters.platform === p} onClick={() => setPlatform(p)} />)}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

      {/* DATE RANGE */}
      <div>
        <p className="text-[9px] font-bold tracking-widest mb-2.5" style={{ color: "rgba(255,255,255,0.25)" }}>DATE</p>
        <DualRangeSlider min={1990} max={CURRENT_YEAR} step={1}
          value={filters.dateRange} onValueChange={setDate}
          formatValue={v => String(v)} accentColor="#49BCF9" />
      </div>

      {/* PRICE RANGE */}
      <div>
        <p className="text-[9px] font-bold tracking-widest mb-2.5" style={{ color: "rgba(255,255,255,0.25)" }}>PRICE</p>
        <DualRangeSlider min={0} max={100} step={1}
          value={filters.priceRange} onValueChange={setPrice}
          formatValue={v => v === 0 ? "Free" : `$${v}`} accentColor="#49BCF9" />
      </div>
    </motion.div>
  )
}

// ─── LazySection — renders children, fires onVisible once when near viewport ──
function LazySection({ onVisible, children }: { onVisible: () => void; children: React.ReactNode }) {
  const ref     = useRef<HTMLDivElement>(null)
  const cbRef   = useRef(onVisible)
  cbRef.current = onVisible           // always current, no stale closure
  const fired   = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !fired.current) {
        fired.current = true
        cbRef.current()
        obs.disconnect()
      }
    }, { rootMargin: "500px 0px" })   // start loading 500px before it's visible
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return <div ref={ref}>{children}</div>
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router           = useRouter()
  const { user } = useAuth()
  const isLoggedIn       = !!user
  const { counts: unreadCounts, refresh: refreshUnread } = useUnreadCount()
  const { totalUnread: chatUnread } = useChat()

  const [searchOpen,   setSearchOpen]   = useState(false)
  const [query,        setQuery]        = useState("")
  const [filterOpen,   setFilterOpen]   = useState(false)
  const [filters,      setFilters]      = useState<Filters>(DEFAULT_FILTERS)
  const [notifOpen,    setNotifOpen]    = useState(false)

  // Data
  const [sections,     setSections]     = useState<Record<string, Game[]>>({})
  const [prices,       setPrices]       = useState<Record<number, CardPrice | null>>({})
  const [wishlistIds,  setWishlistIds]  = useState<Set<string>>(new Set())
  const [loading,      setLoading]      = useState(true)

  // Lazy-loading: tracks which sections have been triggered by IntersectionObserver
  const [triggered,    setTriggered]    = useState<Set<string>>(new Set())
  const triggeredRef                    = useRef<Set<string>>(new Set())

  // Always-current ref to sections (avoids stale closures inside lazy callbacks)
  const sectionsRef                     = useRef<Record<string, Game[]>>({})

  // Inline search
  const [searchResults,  setSearchResults]  = useState<Game[]>([])
  const [searchLoading,  setSearchLoading]  = useState(false)

  // Random pages per reload for variety
  const [randomPages] = useState(() => ({
    popular: Math.floor(Math.random() * 5) + 1,
    new:     Math.floor(Math.random() * 4) + 1,
    trended: Math.floor(Math.random() * 4) + 1,
  }))

  const contentRef   = useRef<HTMLDivElement>(null)
  const filterRef    = useRef<HTMLDivElement>(null)
  const filterPopRef = useRef<HTMLDivElement>(null)
  const [filterPos, setFilterPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  // Keep sectionsRef in sync so lazy callbacks always see fresh data
  useEffect(() => { sectionsRef.current = sections }, [sections])

  // Close filter on outside click — check both the button ref and the portal popup ref
  useEffect(() => {
    if (!filterOpen) return
    const h = (e: MouseEvent) => {
      const t = e.target as Node
      if (
        filterRef.current    && !filterRef.current.contains(t) &&
        filterPopRef.current && !filterPopRef.current.contains(t)
      ) setFilterOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [filterOpen])

  // ── Price fetching — ITAD batch endpoint (price + discount %) ───────────────
  const fetchPricesFor = useCallback(async (games: Game[]) => {
    // Deduplicate by id
    const unique = [...new Map(games.map(g => [g.id, g])).values()]
    // Batches of 20 — backend handles UUID resolution + ITAD overview internally
    for (let i = 0; i < unique.length; i += 20) {
      const batch = unique.slice(i, i + 20)
      const result = await getCardPrices(
        batch.map(g => ({ id: g.id, name: g.name, steamAppId: g.steamAppId }))
      )
      // Update page-level prices state (used by filters) AND prime the hook
      // cache so cards mounted already — or mounted later — are served instantly.
      setPrices(prev => ({ ...prev, ...result }))
      primeCache(result)
      if (i + 20 < unique.length) await new Promise(res => setTimeout(res, 300))
    }
  }, [])

  // ── Lazy section trigger — called once when section enters viewport ─────────
  const triggerSection = useCallback((key: string) => {
    if (triggeredRef.current.has(key)) return
    triggeredRef.current.add(key)
    setTriggered(new Set(triggeredRef.current))

    switch (key) {
      // Data already in state — just fetch prices on demand
      case "Trended":
      case "Favorites":
      case "For you":
        fetchPricesFor(sectionsRef.current[key] ?? [])
        break

      // Lazy data sections — fetch data then prices
      case "Free to Play":
        getFreeToPlayGames().then(gs => {
          const g = gs.slice(0, 10)
          setSections(prev => ({ ...prev, "Free to Play": g }))
          fetchPricesFor(g)
        }).catch(() => {})
        break

      case "Hidden Gems":
        getHiddenGemsGames().then(gs => {
          const g = gs.slice(0, 10)
          setSections(prev => ({ ...prev, "Hidden Gems": g }))
          fetchPricesFor(g)
        }).catch(() => {})
        break

      case "DisLow games":
        getDisLowGames().then(gs => {
          setSections(prev => ({ ...prev, "DisLow games": gs }))
          fetchPricesFor(gs)
        }).catch(() => {})
        break
    }
  }, [fetchPricesFor])

  // ── Data loading ──────────────────────────────────────────────────────────
  useEffect(() => { loadAll() }, [isLoggedIn])

  const loadAll = async () => {
    setLoading(true)
    try {
      // ── Critical path — must succeed for the page to show ──────────────────
      const publicLoad = Promise.all([
        getPopularGames(randomPages.popular),
        getNewGames(randomPages.new),
        getTrendedGames(randomPages.trended),
      ])
      const authLoad = isLoggedIn
        ? Promise.all([getWishlist(), getForYouGames()])
        : Promise.resolve([[] as WishlistItem[], [] as Game[]] as const)

      const [[popular, newGames, trended], [wishlist, forYou]] = await Promise.all([publicLoad, authLoad])

      // Build Favorites from wishlist.
      // If a game's cover is missing (null DB entry from before cover storage was added),
      // fetch the full RAWG record now — in parallel, only for the games that need it.
      const rawFavs: Game[] = (wishlist as WishlistItem[]).map(w => ({
        id: Number(w.gameId), slug: w.gameSlug, name: w.gameName,
        cover: w.gameCover, rating: 0, genres: [], platforms: [], released: "", metacritic: null,
      }))
      const favGames: Game[] = rawFavs.length === 0 ? [] : await Promise.all(
        rawFavs.map(g => g.cover ? Promise.resolve(g) : getGameById(String(g.id)).catch(() => g))
      )

      setWishlistIds(new Set((wishlist as WishlistItem[]).map(w => w.gameId)))

      const built: Record<string, Game[]> = {
        Favorites:  favGames,
        "For you":  (forYou as Game[]).slice(0, 10),
        Popular:    popular.slice(0, 10),
        New:        newGames.slice(0, 9),
        Trended:    trended.slice(0, 10),
      }
      setSections(built)

      // Only fetch prices for above-fold sections immediately (Popular + New).
      // Every other section's prices are fetched lazily when it scrolls into view.
      fetchPricesFor([...popular.slice(0, 10), ...newGames.slice(0, 9)])

    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  // ── Inline search — use-debounce (300 ms) ────────────────────────────────
  const runSearch = useDebouncedCallback(async (q: string) => {
    try {
      const results = await searchGames(q)
      setSearchResults(results)
    } catch { setSearchResults([]) }
    finally { setSearchLoading(false) }
  }, 300)

  useEffect(() => {
    if (!searchOpen || query.trim().length < 2) {
      setSearchResults([]); setSearchLoading(false); return
    }
    setSearchLoading(true)
    runSearch(query.trim())
  }, [query, searchOpen])

  // ── Filtered sections ─────────────────────────────────────────────────────
  const filteredSections = useMemo(() => {
    const isDefault = (
      filters.genre    === DEFAULT_FILTERS.genre    &&
      filters.platform === DEFAULT_FILTERS.platform &&
      filters.dateRange[0]  === DEFAULT_FILTERS.dateRange[0]  &&
      filters.dateRange[1]  === DEFAULT_FILTERS.dateRange[1]  &&
      filters.priceRange[0] === DEFAULT_FILTERS.priceRange[0] &&
      filters.priceRange[1] === DEFAULT_FILTERS.priceRange[1]
    )
    if (isDefault) return sections
    const out: Record<string, Game[]> = {}
    for (const [k, gs] of Object.entries(sections)) {
      let f = gs
      if (filters.platform !== "All platforms")
        f = f.filter(g => matchesPlatform(g.platforms, filters.platform))
      if (filters.genre !== "All genres")
        f = f.filter(g => g.genres.some(gen => gen.toLowerCase().includes(filters.genre.toLowerCase())))
      // Date range
      if (filters.dateRange[0] !== DEFAULT_FILTERS.dateRange[0] || filters.dateRange[1] !== DEFAULT_FILTERS.dateRange[1]) {
        f = f.filter(g => {
          if (!g.released) return true
          const year = new Date(g.released).getFullYear()
          return year >= filters.dateRange[0] && year <= filters.dateRange[1]
        })
      }
      // Price range
      if (filters.priceRange[0] !== DEFAULT_FILTERS.priceRange[0] || filters.priceRange[1] !== DEFAULT_FILTERS.priceRange[1]) {
        f = f.filter(g => {
          const p = prices[g.id]
          if (!p) return true
          if (p.isFree) return filters.priceRange[0] === 0
          return p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]
        })
      }
      out[k] = f
    }
    return out
  }, [sections, filters, prices])

  const closeSearch = useCallback(() => {
    setSearchOpen(false); setQuery(""); setSearchResults([])
  }, [])

  // Stable ref so the callback identity never changes — prevents re-rendering
  // every GameCard whenever any wishlist toggle fires.
  const wishlistIdsRef = useRef(wishlistIds)
  wishlistIdsRef.current = wishlistIds

  const handleToggleFavorite = useCallback(async (e: React.MouseEvent, game: Game) => {
    e.stopPropagation()
    if (!isLoggedIn) { router.push("/login"); return }
    const id = String(game.id)
    const had = wishlistIdsRef.current.has(id)
    setWishlistIds(p => { const n = new Set(p); had ? n.delete(id) : n.add(id); return n })
    try {
      if (had) {
        await removeFromWishlist(id)
        setSections(p => ({ ...p, Favorites: (p.Favorites ?? []).filter(g => String(g.id) !== id) }))
      } else {
        await addToWishlist({ gameId: id, gameName: game.name, gameCover: game.cover, gameSlug: game.slug })
        setSections(p => ({ ...p, Favorites: [game, ...(p.Favorites ?? [])] }))
      }
    } catch {
      setWishlistIds(p => { const n = new Set(p); had ? n.add(id) : n.delete(id); return n })
    }
  }, [isLoggedIn, router])

  const visibleSections   = ALL_SECTIONS.filter(s => !s.authOnly || isLoggedIn)
  const userInitial       = user?.name?.charAt(0)?.toUpperCase() ?? "?"
  const activeFilterCount = [
    filters.genre    !== DEFAULT_FILTERS.genre,
    filters.platform !== DEFAULT_FILTERS.platform,
    filters.dateRange[0]  !== DEFAULT_FILTERS.dateRange[0] || filters.dateRange[1]  !== DEFAULT_FILTERS.dateRange[1],
    filters.priceRange[0] !== DEFAULT_FILTERS.priceRange[0] || filters.priceRange[1] !== DEFAULT_FILTERS.priceRange[1],
  ].filter(Boolean).length
  const isSearching       = searchOpen && query.trim().length >= 2

  return (
    // Shell (sidebar + background) is provided by (app)/layout.tsx
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

          {/* HEADER — z-index: 100 so filter dropdown renders above game cards */}
          <motion.header
            initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
            className="flex items-center gap-3 flex-shrink-0"
            style={{
              height: 52, ...headerGlass, borderRadius: 12,
              marginTop: 12,
              marginInline: "auto",
              width: `min(calc(100% - ${CONTENT_SIDE_PADDING * 2}px), ${CONTENT_MAX_WIDTH}px)`,
              position: "relative", zIndex: 100,   // ← above all content
            }}
          >
            {/* Filter */}
            <div className="relative flex-shrink-0 ml-6" ref={filterRef}>
              <motion.button
                onClick={() => {
                  if (filterRef.current) {
                    const r = filterRef.current.getBoundingClientRect()
                    setFilterPos({ top: r.bottom + 22, left: r.left })
                  }
                  setFilterOpen(v => !v)
                }}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 px-2.5 py-1.5"
                style={{
                  borderRadius: 8,
                  color: filterOpen || activeFilterCount > 0 ? "#49BCF9" : "rgba(255,255,255,0.45)",
                  background: filterOpen ? "rgba(52,82,229,0.15)" : "transparent",
                }}>
                <SlidersHorizontal size={16} />
                <span className={`text-[18px] ${filterOpen || activeFilterCount > 0 ? "font-bold" : "font-medium"}`}>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="text-[9px] font-bold flex items-center justify-center"
                    style={{ width: 15, height: 15, borderRadius: "50%", background: "#3452E5", color: "#fff" }}>
                    {activeFilterCount}
                  </span>
                )}
              </motion.button>
              {filterOpen && createPortal(
                <AnimatePresence>
                  <FilterDropdown filters={filters} onChange={setFilters} onClose={() => setFilterOpen(false)} pos={filterPos} popupRef={filterPopRef} />
                </AnimatePresence>,
                document.body
              )}
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <motion.button
                onClick={() => {
                  if (searchOpen) closeSearch()
                  else setSearchOpen(true)
                }}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 px-2.5 py-1.5"
                style={{
                  borderRadius: 8,
                  color: searchOpen ? "#49BCF9" : "rgba(255,255,255,0.45)",
                  background: searchOpen ? "rgba(73,188,249,0.10)" : "transparent",
                }}>
                <Search size={16} />
                {!searchOpen && <span className={`text-[18px] ${searchOpen ? "font-bold" : "font-medium"}`}>Search</span>}
              </motion.button>
              <AnimatePresence>
                {searchOpen && (
                  <motion.input
                    initial={{ width: 0, opacity: 0 }} animate={{ width: 180, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                    autoFocus value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === "Escape") closeSearch() }}
                    placeholder="Search games…"
                    className="bg-transparent text-white text-[18px] outline-none border-b overflow-hidden"
                    style={{ borderColor: "rgba(255,255,255,0.2)" }}
                  />
                )}
              </AnimatePresence>
              {/* Clear search */}
              <AnimatePresence>
                {searchOpen && query && (
                  <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setQuery("")}
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    style={{ color: "rgba(255,255,255,0.3)" }}>
                    <X size={12} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Bell + Avatar */}
            <div className="flex items-center gap-3 flex-shrink-0 mr-6">
              {/* Bell — opens a popover with the latest notifications.
                  Sidebar Notifications nav still routes to the full /notifications page. */}
              <div className="relative">
                <motion.button
                  onClick={() => {
                    if (!isLoggedIn) { router.push("/login"); return }
                    setNotifOpen(v => !v)
                  }}
                  whileHover={{ scale: 1.15, rotate: 10 }}
                  whileTap={{ scale: 0.9 }}
                  className="relative cursor-pointer flex items-center justify-center"
                  style={{ background: "transparent", border: "none", padding: 4 }}
                  aria-label="Notifications"
                >
                  <Bell size={16} style={{ color: notifOpen ? "#48BCF9" : "rgba(255,255,255,0.45)" }} />
                  {isLoggedIn && unreadCounts.total + chatUnread > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5"
                      style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF6B4A" }}
                    />
                  )}
                </motion.button>
                <NotificationPopover
                  open={notifOpen && isLoggedIn}
                  onClose={() => setNotifOpen(false)}
                  onMutated={refreshUnread}
                  anchor="right"
                />
              </div>
              {isLoggedIn ? (
                <motion.div {...fadeUp(0.35)}
                  whileHover={{ scale: 1.08, boxShadow: "0 0 12px rgba(174,59,214,0.5)" }} whileTap={{ scale: 0.95 }}
                  className="w-8 h-8 flex items-center justify-center text-sm font-bold text-white cursor-pointer"
                  style={{ borderRadius: 10, background: "linear-gradient(135deg, #AE3BD6, #6475D1)" }}
                  onClick={() => router.push("/profile")}>
                  {userInitial}
                </motion.div>
              ) : (
                <motion.button {...fadeUp(0.35)} onClick={() => router.push("/login")}
                  whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.95 }}
                  className="flex items-center justify-center"
                  style={{ background: "transparent", border: "none", padding: 4, color: "#49BCF9", cursor: "pointer" }}
                  aria-label="Log in"
                  title="Log in"
                >
                  <svg width="18" height="22" viewBox="0 0 15 19" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 0H6C5.20435 0 4.44129 0.316071 3.87868 0.87868C3.31607 1.44129 3 2.20435 3 3V7H4V3C4 2.46957 4.21071 1.96086 4.58579 1.58579C4.96086 1.21071 5.46957 1 6 1H12C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V16C14 16.5304 13.7893 17.0391 13.4142 17.4142C13.0391 17.7893 12.5304 18 12 18H6C5.46957 18 4.96086 17.7893 4.58579 17.4142C4.21071 17.0391 4 16.5304 4 16V12H3V16C3 16.7956 3.31607 17.5587 3.87868 18.1213C4.44129 18.6839 5.20435 19 6 19H12C12.7956 19 13.5587 18.6839 14.1213 18.1213C14.6839 17.5587 15 16.7956 15 16V3C15 2.20435 14.6839 1.44129 14.1213 0.87868C13.5587 0.316071 12.7956 0 12 0ZM0 9H10.25L7 5.75L7.66 5L12.16 9.5L7.66 14L7 13.25L10.25 10H0V9Z" />
                  </svg>
                </motion.button>
              )}
            </div>
          </motion.header>

          {/* ── CONTENT ── */}
          <div ref={contentRef} className="flex-1 overflow-y-auto py-5 space-y-20"
            style={{
              scrollbarWidth: "none",
              // Use paddingInline instead of shrinking width so the element
              // stays full-column-width — prevents glow / text clipping on
              // smaller windows where width-192px collapsed to near zero.
              paddingInline: CONTENT_SIDE_PADDING,
              maxWidth: CONTENT_MAX_WIDTH,
              marginInline: "auto",
              boxSizing: "border-box",
            }}>

            {loading ? <LoadingSkeleton /> : isSearching ? (
              /* ── SEARCH RESULTS ── */
              <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-bold text-[15px]">
                    Search results for{" "}
                    <span style={{ color: "#48BCF9" }}>"{query}"</span>
                  </h2>
                  <motion.button onClick={closeSearch}
                    whileHover={{ x: 2, color: "rgba(255,255,255,0.8)" }} whileTap={{ scale: 0.97 }}
                    className="text-[11px] flex items-center gap-1"
                    style={{ color: "rgba(255,255,255,0.35)" }}>
                    <X size={11} /> Clear
                  </motion.button>
                </div>

                {searchLoading ? (
                  <div className="flex gap-5">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex-shrink-0 animate-pulse"
                        style={{ width: 220, height: 308, background: "rgba(255,255,255,0.05)", borderRadius: 10 }} />
                    ))}
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="flex items-center justify-center py-16"
                    style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px dashed rgba(255,255,255,0.08)" }}>
                    <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                      No games found for "{query}"
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-5">
                    {searchResults.map((game, i) => (
                      <motion.div key={game.id}
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.4, ease: "easeOut" }}>
                        <GameCard game={game}
                          isFavorited={wishlistIds.has(String(game.id))}
                          onToggleFavorite={e => handleToggleFavorite(e, game)} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.section>
            ) : (
              /* ── NORMAL SECTIONS ── */
              visibleSections.map(({ label, key }, idx) => {
                const games = filteredSections[key as keyof typeof filteredSections] ?? []
                const delay = 0.28 + idx * 0.07

                // ── Popular — always above-fold, no lazy wrapper ─────────────
                if (key === "Popular") return games.length > 0 ? (
                  <PopularCarousel
                    key={key}
                    games={games}
                    wishlistIds={wishlistIds}
                    onToggleFavorite={handleToggleFavorite}
                    onSeeAll={() => router.push("/section/popular")}
                    delay={delay}
                  />
                ) : null

                // ── New — always above-fold, no lazy wrapper ─────────────────
                if (key === "New") return games.length > 0 ? (
                  <NewBentoGrid
                    key={key}
                    games={games}
                    wishlistIds={wishlistIds}
                    onToggleFavorite={handleToggleFavorite}
                    onSeeAll={() => router.push("/section/new")}
                    delay={delay}
                  />
                ) : null

                // ── Favorites — lazy price fetch ─────────────────────────────
                if (key === "Favorites") {
                  if (games.length === 0) return (
                    <LazySection key={key} onVisible={() => triggerSection("Favorites")}>
                      <motion.section data-section={key} {...fadeUp(delay)}>
                        <SectionHeading title={label} delay={delay} />
                        <div className="flex items-center justify-center py-14"
                          style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px dashed rgba(255,255,255,0.08)" }}>
                          <div className="text-center">
                            <Star size={28} className="mx-auto mb-2" style={{ color: "rgba(255,255,255,0.2)" }} />
                            <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                              No favorites yet — click ★ on any game to save it
                            </p>
                          </div>
                        </div>
                      </motion.section>
                    </LazySection>
                  )
                  return (
                    <LazySection key={key} onVisible={() => triggerSection("Favorites")}>
                      <FavoritesShelf
                        games={games}
                        wishlistIds={wishlistIds}
                        onToggleFavorite={handleToggleFavorite}
                        onSeeAll={() => router.push("/section/favorites")}
                        delay={delay}
                      />
                    </LazySection>
                  )
                }

                // ── Lazy data sections (Free to Play, Hidden Gems, DisLow games) ──
                // Always render sentinel so observer can fire even before data arrives
                if (key === "Free to Play" || key === "Hidden Gems" || key === "DisLow games") return (
                  <LazySection key={key} onVisible={() => triggerSection(key)}>
                    {games.length > 0 && (
                      <motion.section data-section={key}
                        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay, duration: 0.5, ease: "easeOut" }}>
                        <SectionHeading
                          title={label}
                          onSeeAll={() => router.push(`/section/${toSlug(key)}`)}
                          delay={delay}
                        />
                        <ScrollableRow gap={48} paddingTop={16} paddingBottom={16} paddingLeft={12} paddingRight={12}>
                          {games.map((game, i) => (
                            <motion.div key={game.id}
                              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: delay + i * 0.035, duration: 0.45, ease: "easeOut" }}>
                              <GameCard game={game} rank={i + 1}
                                isFavorited={wishlistIds.has(String(game.id))}
                                onToggleFavorite={e => handleToggleFavorite(e, game)}
                                imageSize={{ w: 346, h: 374 }} />
                            </motion.div>
                          ))}
                        </ScrollableRow>
                      </motion.section>
                    )}
                  </LazySection>
                )

                // ── Default lazy sections (Trended, For you) ─────────────────
                if (games.length === 0) return null

                return (
                  <LazySection key={key} onVisible={() => triggerSection(key)}>
                    <motion.section data-section={key}
                      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay, duration: 0.5, ease: "easeOut" }}>
                      <SectionHeading
                        title={label}
                        onSeeAll={() => router.push(`/section/${toSlug(key)}`)}
                        delay={delay}
                      />
                      <ScrollableRow gap={36} paddingTop={16} paddingBottom={16} paddingLeft={12} paddingRight={12}>
                        {games.map((game, i) => (
                          <motion.div key={game.id}
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: delay + i * 0.035, duration: 0.45, ease: "easeOut" }}>
                            <GameCard game={game} rank={i + 1}
                              isFavorited={wishlistIds.has(String(game.id))}
                              onToggleFavorite={e => handleToggleFavorite(e, game)}
                              imageSize={key === "Trended" || key === "For you" ? { w: 346, h: 374 } : undefined} />
                          </motion.div>
                        ))}
                      </ScrollableRow>
                    </motion.section>
                  </LazySection>
                )
              })
            )}
            <div style={{ height: 32 }} />
          </div>
        </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      {[...Array(3)].map((_, i) => (
        <div key={i}>
          <motion.div {...fadeUp(i * 0.08)} className="h-3.5 w-20 rounded-full mb-4 animate-pulse"
            style={{ background: "rgba(255,255,255,0.08)" }} />
          <div className="flex gap-5">
            {[...Array(5)].map((_, j) => (
              <div key={j} className="flex-shrink-0 animate-pulse"
                style={{ width: 220, height: 308, background: "rgba(255,255,255,0.05)", borderRadius: 10 }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
