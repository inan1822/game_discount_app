"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useDebouncedCallback } from "use-debounce"
import {
  SlidersHorizontal, Search, Bell,
  Home, BellRing, Search as SearchIcon,
  Users, User, Star, LogIn, X, ChevronDown, Receipt, Shield,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import PageBackground from "@/components/ui/PageBackground"
import GameCard from "@/components/game/GameCard"
import PopularCarousel from "@/components/game/PopularCarousel"
import NewBentoGrid from "@/components/game/NewBentoGrid"
import FavoritesShelf from "@/components/game/FavoritesShelf"
import DealOfTheDay from "@/components/game/DealOfTheDay"
import ByGenre from "@/components/game/ByGenre"
import { SectionHeading } from "@/components/ui/SectionHeading"
import {
  getPopularGames, getNewGames, getTrendedGames, getForYouGames, searchGames, getGameById,
  getFreeToPlayGames, getHiddenGemsGames, getDealOfDay, getCardPrices,
  type DealOfDay as DealOfDayType,
} from "@/lib/api/games"
import { primeCache } from "@/hooks/useCardPrice"
import { getWishlist, addToWishlist, removeFromWishlist } from "@/lib/api/wishlist"
import { useUnreadCount } from "@/hooks/useUnreadCount"
import NotificationDot from "@/components/ui/NotificationDot"
import NotificationPopover from "@/components/notifications/NotificationPopover"
import type { Game, WishlistItem, CardPrice } from "@/types/game"

// ─── Constants ────────────────────────────────────────────────────────────────
// "Favorites" lives in the sidebar now (under Notifications); "For you" was removed.
const AUTH_NAV = new Set(["Notifications", "Favorites", "Friends", "Profile", "Purchases"])

const NAV = [
  { icon: Home,        label: "Home",          href: "/"               },
  { icon: BellRing,    label: "Notifications", href: "/notifications"  },
  { icon: Star,        label: "Favorites",     href: "/wishlist"       },
  { icon: SearchIcon,  label: "Search",        href: "/search"         },
  { icon: Receipt,     label: "Purchases",     href: "/account/orders" },
  { icon: Users,       label: "Friends",       href: "/friends"        },
  { icon: User,        label: "Profile",       href: "/profile"        },
] as const

const ALL_SECTIONS = [
  { label: "Popular",      key: "Popular",      authOnly: false },
  { label: "New",          key: "New",          authOnly: false },
  { label: "Favorites",    key: "Favorites",    authOnly: true  },
  { label: "For you",      key: "For you",      authOnly: true  },
  { label: "Trended",      key: "Trended",      authOnly: false },
  { label: "Deal of Day",  key: "Deal of Day",  authOnly: false },
  { label: "Free to Play", key: "Free to Play", authOnly: false },
  { label: "Hidden Gems",  key: "Hidden Gems",  authOnly: false },
  { label: "By Genre",     key: "By Genre",     authOnly: false },
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
const glassStyle = {
  background: "rgba(30, 38, 51, 0.70)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
} as const

// Header glass — lighter opacity (50%) so the floating bar reads as glass,
// not as a solid strip. Sidebar keeps glassStyle (70%) for legibility.
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

// ─── Nav Glow Item ────────────────────────────────────────────────────────────
function NavGlowItem({
  icon: Icon,
  label,
  active,
  locked,
  delay,
  dot,
  onClick,
}: {
  icon:    React.ElementType
  label:   string
  active:  boolean
  locked:  boolean
  delay:   number
  dot?:    React.ReactNode
  onClick: () => void
}) {
  const ref                       = useRef<HTMLButtonElement>(null)
  const [pos,     setPos]         = useState({ x: 0, y: 0 })
  const [hovered, setHovered]     = useState(false)

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.35 }}
      onMouseMove={e => {
        const r = ref.current!.getBoundingClientRect()
        setPos({ x: e.clientX - r.left, y: e.clientY - r.top })
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileTap={{ scale: 0.97 }}
      className="w-full flex items-center gap-3 px-3 py-2.5 mb-0.5 text-[16px] font-medium relative overflow-hidden"
      style={{
        borderRadius: 10,
        color: active
          ? "#48BCF9"
          : locked
          ? "rgba(255,255,255,0.25)"
          : hovered
          ? "#48BCF9"
          : "rgba(255,255,255,0.45)",
        background: active ? "rgba(52,82,229,0.13)" : "transparent",
        border: "none",
        cursor: "pointer",
        transition: "color 0.25s",
      }}
    >
      {/* Active left indicator */}
      {active && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2"
          style={{ width: 3, height: 20, background: "#48BCF9", borderRadius: "0 4px 4px 0" }}
        />
      )}

      {/* Cursor-tracking glow */}
      <div
        style={{
          position:     "absolute",
          left:         pos.x,
          top:          pos.y,
          width:        140,
          height:       140,
          borderRadius: "50%",
          transform:    "translate(-50%, -50%)",
          background:   "radial-gradient(circle, #48BCF9 10%, transparent 70%)",
          opacity:      hovered && !active ? 0.14 : 0,
          transition:   "opacity 0.3s",
          pointerEvents: "none",
          zIndex:       0,
        }}
      />

      <Icon size={15} style={{ position: "relative", zIndex: 1 }} />
      <span style={{ position: "relative", zIndex: 1, flex: 1, textAlign: "left" }}>{label}</span>
      {locked && (
        <span
          className="text-[8px] px-1 py-0.5 rounded"
          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.2)", position: "relative", zIndex: 1 }}
        >
          Login
        </span>
      )}
      {dot && <span style={{ position: "relative", zIndex: 1 }}>{dot}</span>}
    </motion.button>
  )
}

// ─── Range Slider ─────────────────────────────────────────────────────────────
function RangeSlider({
  min, max, value, onChange, formatLabel,
  accentColor = "#3452E5",
}: {
  min: number; max: number
  value: [number, number]
  onChange: (v: [number, number]) => void
  formatLabel: (v: number) => string
  accentColor?: string
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<"min" | "max" | null>(null)

  const pct = (v: number) => ((v - min) / (max - min)) * 100

  const getValueFromX = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return min
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round(min + ratio * (max - min))
  }

  const handleTrackClick = (e: React.MouseEvent) => {
    const v = getValueFromX(e.clientX)
    const dMin = Math.abs(v - value[0])
    const dMax = Math.abs(v - value[1])
    if (dMin <= dMax) onChange([Math.min(v, value[1]), value[1]])
    else              onChange([value[0], Math.max(v, value[0])])
  }

  useEffect(() => {
    if (!dragging) return
    const move = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
      const v = getValueFromX(clientX)
      if (dragging === "min") onChange([Math.min(v, value[1] - 1), value[1]])
      else                    onChange([value[0], Math.max(v, value[0] + 1)])
    }
    const up = () => setDragging(null)
    window.addEventListener("mousemove", move)
    window.addEventListener("mouseup", up)
    window.addEventListener("touchmove", move)
    window.addEventListener("touchend", up)
    return () => {
      window.removeEventListener("mousemove", move)
      window.removeEventListener("mouseup", up)
      window.removeEventListener("touchmove", move)
      window.removeEventListener("touchend", up)
    }
  }, [dragging, value, onChange])

  const minPct = pct(value[0])
  const maxPct = pct(value[1])

  return (
    <div className="flex flex-col gap-2">
      {/* Labels */}
      <div className="flex justify-between text-[11px] font-semibold" style={{ color: accentColor }}>
        <span>{formatLabel(value[0])}</span>
        <span>{formatLabel(value[1])}</span>
      </div>
      {/* Track */}
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className="relative h-1 rounded-full cursor-pointer select-none"
        style={{ background: "rgba(255,255,255,0.10)" }}
      >
        {/* Filled range */}
        <div className="absolute top-0 bottom-0 rounded-full pointer-events-none"
          style={{ left: `${minPct}%`, right: `${100 - maxPct}%`, background: accentColor, opacity: 0.85 }} />
        {/* Min thumb */}
        <div
          onMouseDown={e => { e.preventDefault(); setDragging("min") }}
          onTouchStart={e => { e.preventDefault(); setDragging("min") }}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full cursor-grab active:cursor-grabbing"
          style={{
            left: `${minPct}%`,
            background: "#fff",
            boxShadow: `0 0 0 2px ${accentColor}`,
            zIndex: 2,
          }}
        />
        {/* Max thumb */}
        <div
          onMouseDown={e => { e.preventDefault(); setDragging("max") }}
          onTouchStart={e => { e.preventDefault(); setDragging("max") }}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full cursor-grab active:cursor-grabbing"
          style={{
            left: `${maxPct}%`,
            background: "#fff",
            boxShadow: `0 0 0 2px ${accentColor}`,
            zIndex: 2,
          }}
        />
      </div>
    </div>
  )
}

// ─── Filter Dropdown ──────────────────────────────────────────────────────────
function FilterDropdown({ filters, onChange, onClose }: {
  filters:  Filters
  onChange: (f: Filters) => void
  onClose:  () => void
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
      className="absolute top-full left-0 mt-2 z-[200] flex flex-col gap-4 p-4"
      style={{
        width:                320,
        background:           "rgba(30,38,51,0.80)",
        backdropFilter:       "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderRadius:         12,
        boxShadow:            "0 16px 48px rgba(0,0,0,0.6)",
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
      <Section title="STYLE">
        <div className="flex flex-wrap gap-1.5">
          {FILTER_STYLE.map(g => <Pill key={g} label={g} active={filters.genre === g} onClick={() => setGenre(g)} />)}
        </div>
      </Section>

      {/* PLATFORM */}
      <Section title="PLATFORM">
        <div className="flex flex-wrap gap-1.5">
          {FILTER_PLATFORM.map(p => <Pill key={p} label={p} active={filters.platform === p} onClick={() => setPlatform(p)} />)}
        </div>
      </Section>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

      {/* DATE RANGE */}
      <Section title="DATE">
        <RangeSlider
          min={1990} max={CURRENT_YEAR}
          value={filters.dateRange}
          onChange={setDate}
          formatLabel={v => String(v)}
          accentColor="#3452E5"
        />
      </Section>

      {/* PRICE RANGE */}
      <Section title="PRICE">
        <RangeSlider
          min={0} max={100}
          value={filters.priceRange}
          onChange={setPrice}
          formatLabel={v => v === 0 ? "Free" : `$${v}`}
          accentColor="#49BCF9"
        />
      </Section>
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
  const { user, logout } = useAuth()
  const isLoggedIn       = !!user
  const { counts: unreadCounts, refresh: refreshUnread } = useUnreadCount()

  const [activeNav,    setActiveNav]    = useState("Home")
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

  // New sections data
  const [dealOfDay,      setDealOfDay]      = useState<DealOfDayType | null>(null)

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

  const contentRef = useRef<HTMLDivElement>(null)
  const filterRef  = useRef<HTMLDivElement>(null)

  // Keep sectionsRef in sync so lazy callbacks always see fresh data
  useEffect(() => { sectionsRef.current = sections }, [sections])

  // Close filter on outside click
  useEffect(() => {
    if (!filterOpen) return
    const h = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false)
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

      case "Deal of Day":
        getDealOfDay().then(d => { if (d) setDealOfDay(d) }).catch(() => {})
        break

      // By Genre fetches its own data internally once enabled=true
      case "By Genre":
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

  // ── Scroll to section ─────────────────────────────────────────────────────
  const scrollToSection = useCallback((key: string) => {
    const el = contentRef.current?.querySelector(`[data-section="${key}"]`) as HTMLElement | null
    if (el) contentRef.current!.scrollTo({ top: el.offsetTop - 16, behavior: "smooth" })
  }, [])

  const handleNavClick = useCallback((label: string, href: string) => {
    if (!isLoggedIn && AUTH_NAV.has(label)) { router.push("/login"); return }
    setActiveNav(label); router.push(href)
  }, [isLoggedIn, router])

  const closeSearch = useCallback(() => {
    setSearchOpen(false); setQuery(""); setSearchResults([])
  }, [])

  const handleToggleFavorite = useCallback(async (e: React.MouseEvent, game: Game) => {
    e.stopPropagation()
    if (!isLoggedIn) { router.push("/login"); return }
    const id = String(game.id); const had = wishlistIds.has(id)
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
  }, [isLoggedIn, wishlistIds, router])

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
    <main className="relative w-screen h-screen overflow-hidden" style={{ background: "#1E2532" }}>
      <PageBackground />

      <div className="relative flex h-full" style={{ zIndex: 3 }}>

        {/* ══════════ SIDEBAR ══════════ */}
        <motion.aside
          initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="flex flex-col flex-shrink-0 h-full"
          style={{ width: 240, ...glassStyle, borderRight: "1px solid rgba(255,255,255,0.05)" }}
        >
          <motion.div {...fadeUp(0.05)} className="flex items-center gap-3 px-5 pt-6 pb-5">
            <img src="/icons/logo.svg" alt="" style={{ width: 30, height: 30 }} />
            <span className="text-white font-bold text-[17px] tracking-wide">DisLow</span>
          </motion.div>

          <div className="px-3 mb-1">
            <p className="text-[9px] font-bold tracking-[0.12em] px-3 mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>MENU</p>
            {NAV.map(({ icon: Icon, label, href }, i) => (
              <NavGlowItem
                key={label}
                icon={Icon}
                label={label}
                active={activeNav === label}
                locked={!isLoggedIn && AUTH_NAV.has(label)}
                delay={0.1 + i * 0.05}
                dot={label === "Notifications" && isLoggedIn
                  ? <NotificationDot events={unreadCounts.events} discounts={unreadCounts.discounts} />
                  : undefined
                }
                onClick={() => handleNavClick(label, href)}
              />
            ))}
          </div>

          <div className="flex-1" />

          {/* Admin mode switch — only for admins */}
          {isLoggedIn && user?.role === "admin" && (
            <div className="px-3 pb-2">
              <motion.button
                onClick={() => router.push("/admin")}
                whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-[14px] font-medium"
                style={{
                  borderRadius: 10,
                  color: "#6475D1",
                  background: "rgba(100,117,209,0.13)",
                  border: "1px solid rgba(100,117,209,0.25)",
                  cursor: "pointer",
                }}
              >
                <Shield size={15} />
                <span className="flex-1 text-left">Switch to Admin</span>
              </motion.button>
            </div>
          )}

          {isLoggedIn ? (
            <motion.button {...fadeUp(0.45)} onClick={logout}
              whileHover={{ x: 4, color: "#fff" }} whileTap={{ scale: 0.97 }}
              className="flex items-center gap-3 px-8 py-5 text-[16px] font-medium"
              style={{ color: "rgba(255,255,255,0.35)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF6B4A]" />log out
            </motion.button>
          ) : (
            <motion.button {...fadeUp(0.45)} onClick={() => router.push("/login")}
              whileHover={{ x: 4 }} whileTap={{ scale: 0.97 }}
              className="flex items-center gap-3 px-8 py-5 text-[16px] font-semibold"
              style={{ color: "#48BCF9", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <LogIn size={15} />Log in
            </motion.button>
          )}
        </motion.aside>

        {/* ══════════ RIGHT PANEL ══════════ */}
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
            <div className="relative flex-shrink-0 ml-4" ref={filterRef}>
              <motion.button onClick={() => setFilterOpen(v => !v)}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 px-2.5 py-1.5"
                style={{
                  borderRadius: 8,
                  color: filterOpen || activeFilterCount > 0 ? "#49BCF9" : "rgba(255,255,255,0.45)",
                  background: filterOpen ? "rgba(52,82,229,0.15)" : "transparent",
                }}>
                <SlidersHorizontal size={14} />
                <span className="text-[12px] font-medium">Filter</span>
                {activeFilterCount > 0 && (
                  <span className="text-[9px] font-bold flex items-center justify-center"
                    style={{ width: 15, height: 15, borderRadius: "50%", background: "#3452E5", color: "#fff" }}>
                    {activeFilterCount}
                  </span>
                )}
              </motion.button>
              <AnimatePresence>
                {filterOpen && <FilterDropdown filters={filters} onChange={setFilters} onClose={() => setFilterOpen(false)} />}
              </AnimatePresence>
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
                <Search size={14} />
                {!searchOpen && <span className="text-[12px] font-medium">Search</span>}
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
                    className="bg-transparent text-white text-sm outline-none border-b overflow-hidden"
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

            {/* Logo — centered in header */}
            <div className="flex-1 flex items-center justify-center pointer-events-none select-none">
              <img src="/icons/logo.svg" alt="DisLow" style={{ height: 22, opacity: 0.9 }} />
            </div>

            {/* Bell + Avatar */}
            <div className="flex items-center gap-3 flex-shrink-0 mr-4">
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
                  {isLoggedIn && unreadCounts.total > 0 && (
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
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                  className="text-[12px] font-semibold px-3 py-1"
                  style={{ borderRadius: 8, background: "rgba(52,82,229,0.15)", color: "#48BCF9", border: "1px solid rgba(72,188,249,0.2)" }}>
                  Login
                </motion.button>
              )}
            </div>
          </motion.header>

          {/* ── CONTENT ── */}
          <div ref={contentRef} className="flex-1 overflow-y-auto py-5 space-y-20"
            style={{
              scrollbarWidth: "none",
              // Match the floating header — same maxWidth + auto margins so on
              // ultrawide screens the cards stay centered instead of stretching.
              width: `min(calc(100% - ${CONTENT_SIDE_PADDING * 2}px), ${CONTENT_MAX_WIDTH}px)`,
              marginInline: "auto",
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

                // ── Deal of Day — lazy data, always render sentinel ──────────
                if (key === "Deal of Day") return (
                  <LazySection key={key} onVisible={() => triggerSection("Deal of Day")}>
                    {dealOfDay ? <DealOfTheDay deal={dealOfDay} delay={delay} /> : null}
                  </LazySection>
                )

                // ── By Genre — lazy, self-loading via enabled prop ───────────
                if (key === "By Genre") return (
                  <LazySection key={key} onVisible={() => triggerSection("By Genre")}>
                    <ByGenre
                      enabled={triggered.has("By Genre")}
                      wishlistIds={wishlistIds}
                      onToggleFavorite={handleToggleFavorite}
                      delay={delay}
                    />
                  </LazySection>
                )

                // ── Lazy data sections (Free to Play, Hidden Gems) ───────────
                // Always render sentinel so observer can fire even before data arrives
                if (key === "Free to Play" || key === "Hidden Gems") return (
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
                        <div className="flex overflow-x-auto pb-3" style={{ gap: 48, scrollbarWidth: "none" }}>
                          {games.map((game, i) => (
                            <motion.div key={game.id}
                              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: delay + i * 0.035, duration: 0.45, ease: "easeOut" }}>
                              <GameCard game={game} rank={i + 1}
                                isFavorited={wishlistIds.has(String(game.id))}
                                onToggleFavorite={e => handleToggleFavorite(e, game)} />
                            </motion.div>
                          ))}
                        </div>
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
                      <div className="flex overflow-x-auto pb-3" style={{ gap: 36, scrollbarWidth: "none" }}>
                        {games.map((game, i) => (
                          <motion.div key={game.id}
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: delay + i * 0.035, duration: 0.45, ease: "easeOut" }}>
                            <GameCard game={game} rank={i + 1}
                              isFavorited={wishlistIds.has(String(game.id))}
                              onToggleFavorite={e => handleToggleFavorite(e, game)} />
                          </motion.div>
                        ))}
                      </div>
                    </motion.section>
                  </LazySection>
                )
              })
            )}
            <div style={{ height: 32 }} />
          </div>
        </div>
      </div>
    </main>
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
