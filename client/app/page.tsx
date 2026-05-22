"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useDebouncedCallback } from "use-debounce"
import {
  SlidersHorizontal, Search, Bell,
  Home, BellRing, Search as SearchIcon,
  Users, User, Star, LogIn, X, ChevronDown,
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
  getPopularGames, getNewGames, getTrendedGames, getForYouGames, searchGames, getGameById, getGamePrice,
  getFreeToPlayGames, getHiddenGemsGames, getDealOfDay,
  type DealOfDay as DealOfDayType,
} from "@/lib/api/games"
import { getWishlist, addToWishlist, removeFromWishlist } from "@/lib/api/wishlist"
import { useUnreadCount } from "@/hooks/useUnreadCount"
import NotificationDot from "@/components/ui/NotificationDot"
import type { Game, WishlistItem } from "@/types/game"

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = ["Popular", "New", "Trended", "Favorites", "For you"] as const
type Tab = typeof TABS[number]

const AUTH_NAV = new Set(["Notifications", "Friends", "Profile"])

const NAV = [
  { icon: Home,        label: "Home",         href: "/"              },
  { icon: BellRing,    label: "Notifications", href: "/notifications" },
  { icon: SearchIcon,  label: "Search",        href: "/search"        },
  { icon: Users,       label: "Friends",       href: "/friends"       },
  { icon: User,        label: "Profile",       href: "/profile"       },
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
const FILTER_DATE     = ["All time",      "Last year",  "Last 3 years"] as const
const FILTER_PRICE    = ["Any price",     "Free",       "Under $20",    "Under $60"] as const
const FILTER_STYLE    = ["All genres",    "Action",     "RPG",          "Adventure", "Shooter", "Strategy", "Indie"] as const
const FILTER_PLATFORM = ["All platforms", "PC",         "PS5",          "Xbox",      "Switch"] as const

interface Filters { date: string; price: string; genre: string; platform: string }
const DEFAULT_FILTERS: Filters = { date: "All time", price: "Any price", genre: "All genres", platform: "All platforms" }

// ─── Styles / helpers ─────────────────────────────────────────────────────────
const glassStyle = {
  background: "rgba(30, 38, 51, 0.70)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
} as const

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

/**
 * Thin wrapper — delegates to the backend which proxies CheapShark.
 * Returns null when the game isn't found → card shows "Unknown".
 */
async function fetchCheapestPrice(title: string): Promise<string | null> {
  return getGamePrice(title)
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

// ─── Filter Dropdown ──────────────────────────────────────────────────────────
function FilterDropdown({ filters, onChange, onClose }: {
  filters:  Filters
  onChange: (f: Filters) => void
  onClose:  () => void
}) {
  const set = (k: keyof Filters, v: string) => onChange({ ...filters, [k]: v })

  const Pill = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
      className="text-[11px] font-medium px-2.5 py-1"
      style={{
        borderRadius: 7,
        background: active ? "rgba(174,59,214,0.22)" : "rgba(255,255,255,0.05)",
        color:       active ? "#CF6EF5"               : "rgba(255,255,255,0.5)",
        border:      active ? "1px solid rgba(174,59,214,0.4)" : "1px solid transparent",
      }}
    >{label}</motion.button>
  )

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <p className="text-[9px] font-bold tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>{title}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )

  const hasActive = Object.keys(DEFAULT_FILTERS).some(k => filters[k as keyof Filters] !== DEFAULT_FILTERS[k as keyof Filters])

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{    opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className="absolute top-full left-0 mt-2 z-[200] flex flex-col gap-4 p-4"
      style={{
        width:                320,
        background:           "rgba(30,38,51,0.70)",
        backdropFilter:       "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius:         12,
        border:               "1px solid rgba(255,255,255,0.07)",
        boxShadow:            "0 16px 48px rgba(0,0,0,0.6)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-white text-[13px] font-bold">Filters</span>
        <div className="flex items-center gap-2">
          {hasActive && (
            <motion.button onClick={() => onChange(DEFAULT_FILTERS)}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="text-[10px]" style={{ color: "#AE3BD6" }}>Clear all</motion.button>
          )}
          <motion.button onClick={onClose}
            whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
            style={{ color: "rgba(255,255,255,0.4)" }}><X size={14} /></motion.button>
        </div>
      </div>

      <Section title="DATE">
        {FILTER_DATE.map(d => <Pill key={d} label={d} active={filters.date === d} onClick={() => set("date", d)} />)}
      </Section>
      <Section title="PRICE">
        {FILTER_PRICE.map(p => <Pill key={p} label={p} active={filters.price === p} onClick={() => set("price", p)} />)}
      </Section>
      <Section title="STYLE">
        {FILTER_STYLE.map(g => <Pill key={g} label={g} active={filters.genre === g} onClick={() => set("genre", g)} />)}
      </Section>
      <Section title="PLATFORM">
        {FILTER_PLATFORM.map(p => <Pill key={p} label={p} active={filters.platform === p} onClick={() => set("platform", p)} />)}
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
  const { counts: unreadCounts } = useUnreadCount()

  const [activeTab,    setActiveTab]    = useState<Tab>("Popular")
  const [activeNav,    setActiveNav]    = useState("Home")
  const [searchOpen,   setSearchOpen]   = useState(false)
  const [query,        setQuery]        = useState("")
  const [filterOpen,   setFilterOpen]   = useState(false)
  const [filters,      setFilters]      = useState<Filters>(DEFAULT_FILTERS)

  // Data
  const [sections,     setSections]     = useState<Record<string, Game[]>>({})
  const [prices,       setPrices]       = useState<Record<number, string>>({})
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

  // ── Price fetching — called directly with the game list (no closure issues) ─
  const fetchPricesFor = useCallback(async (games: Game[]) => {
    // Deduplicate by id
    const unique = [...new Map(games.map(g => [g.id, g])).values()]
    // Batches of 5, 600 ms apart — 1 call per game, stays well under rate limits
    for (let i = 0; i < unique.length; i += 5) {
      const batch = unique.slice(i, i + 5)
      const results = await Promise.all(
        batch.map(g => fetchCheapestPrice(g.name).then(price => ({ id: g.id, price })))
      )
      setPrices(prev => {
        const next = { ...prev }
        // null = not in CheapShark DB → "unknown" so card shows "Unknown" not "Free"
        results.forEach(({ id, price }) => { next[id] = price ?? "unknown" })
        return next
      })
      if (i + 5 < unique.length) await new Promise(res => setTimeout(res, 600))
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

      // Build Favorites from wishlist — then enrich with full RAWG data in background
      const favGames: Game[] = (wishlist as WishlistItem[]).map(w => ({
        id: Number(w.gameId), slug: w.gameSlug, name: w.gameName,
        cover: w.gameCover, rating: 0, genres: [], platforms: [], released: "", metacritic: null,
      }))

      if (favGames.length > 0) {
        Promise.allSettled(favGames.map(g => getGameById(String(g.id)))).then(results => {
          const enriched = results.map((r, i) => r.status === "fulfilled" ? r.value : favGames[i])
          setSections(prev => ({ ...prev, Favorites: enriched }))
        })
      }

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
    const def = Object.keys(DEFAULT_FILTERS).every(k => filters[k as keyof Filters] === DEFAULT_FILTERS[k as keyof Filters])
    if (def) return sections
    const out: Record<string, Game[]> = {}
    for (const [k, gs] of Object.entries(sections)) {
      let f = gs
      if (filters.platform !== "All platforms") f = f.filter(g => matchesPlatform(g.platforms, filters.platform))
      if (filters.genre    !== "All genres")    f = f.filter(g => g.genres.some(gen => gen.toLowerCase().includes(filters.genre.toLowerCase())))
      if (filters.date     !== "All time") {
        const cut = new Date(); cut.setFullYear(cut.getFullYear() - (filters.date === "Last year" ? 1 : 3))
        f = f.filter(g => !g.released || new Date(g.released) >= cut)
      }
      if      (filters.price === "Free")       f = f.filter(g => { const p = prices[g.id]; return !p || parseFloat(p) === 0 })
      else if (filters.price !== "Any price")  { const max = filters.price === "Under $20" ? 20 : 60; f = f.filter(g => { const p = prices[g.id]; return !p || parseFloat(p) <= max }) }
      out[k] = f
    }
    return out
  }, [sections, filters, prices])

  // ── Scroll to section ─────────────────────────────────────────────────────
  const scrollToSection = useCallback((key: string) => {
    const el = contentRef.current?.querySelector(`[data-section="${key}"]`) as HTMLElement | null
    if (el) contentRef.current!.scrollTo({ top: el.offsetTop - 16, behavior: "smooth" })
  }, [])

  const handleTabClick = useCallback((tab: Tab) => {
    if ((tab === "Favorites" || tab === "For you") && !isLoggedIn) { router.push("/login"); return }
    setActiveTab(tab)
    setTimeout(() => scrollToSection(tab), 50)
  }, [isLoggedIn, router, scrollToSection])

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
  const activeFilterCount = Object.keys(DEFAULT_FILTERS).filter(k => filters[k as keyof Filters] !== DEFAULT_FILTERS[k as keyof Filters]).length
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
              height: 52, ...glassStyle, borderRadius: 12,
              margin: "12px 80px 0",
              position: "relative", zIndex: 100,   // ← above all content
            }}
          >
            {/* Filter */}
            <div className="relative flex-shrink-0 ml-4" ref={filterRef}>
              <motion.button onClick={() => setFilterOpen(v => !v)}
                whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                className="flex items-center gap-1.5"
                style={{ color: filterOpen || activeFilterCount > 0 ? "#AE3BD6" : "rgba(255,255,255,0.45)" }}>
                <SlidersHorizontal size={16} />
                {activeFilterCount > 0 && (
                  <span className="text-[9px] font-bold flex items-center justify-center"
                    style={{ width: 15, height: 15, borderRadius: "50%", background: "#AE3BD6", color: "#fff" }}>
                    {activeFilterCount}
                  </span>
                )}
                <motion.div animate={{ rotate: filterOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={12} style={{ color: "rgba(255,255,255,0.3)" }} />
                </motion.div>
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
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                style={{ color: searchOpen ? "#48BCF9" : "rgba(255,255,255,0.45)" }}>
                <Search size={16} />
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

            {/* Tabs — h-full so underline is at header's true bottom edge */}
            <div className="relative flex items-stretch gap-0.5 flex-1 h-full">
              {TABS.map((tab, i) => {
                const active = activeTab === tab
                const locked = (tab === "Favorites" || tab === "For you") && !isLoggedIn
                return (
                  <motion.button key={tab}
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18 + i * 0.05, duration: 0.35 }}
                    onClick={() => handleTabClick(tab)}
                    whileHover={{ color: locked ? "rgba(255,255,255,0.3)" : "#48BCF9", backgroundColor: "rgba(72,188,249,0.04)" }}
                    whileTap={{ scale: 0.97 }}
                    className="relative h-full px-3 text-[16px] font-semibold flex items-center gap-1.5"
                    style={{ borderRadius: 10, color: locked ? "rgba(255,255,255,0.2)" : active ? "#48BCF9" : "rgba(255,255,255,0.4)" }}
                  >
                    {tab === "Favorites" && (
                      <Star size={11} fill={active ? "#48BCF9" : "none"}
                        stroke={active ? "#48BCF9" : locked ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.4)"} />
                    )}
                    {tab}
                    {active && !locked && (
                      <motion.div layoutId="tab-underline" className="absolute bottom-0 left-2 right-2"
                        style={{ height: 2, borderRadius: 9999 }}
                        transition={{ type: "spring", stiffness: 380, damping: 22 }}>
                        <div className="absolute inset-0 rounded-full" style={{ background: "#48BCF9" }} />
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                          style={{ width: "55%", height: 10, background: "#48BCF9", filter: "blur(8px)", opacity: 0.7 }} />
                        <div className="absolute left-0 right-0 pointer-events-none"
                          style={{ bottom: -1, height: 56, background: "linear-gradient(to top, rgba(72,188,249,0.13) 0%, rgba(72,188,249,0.04) 65%, transparent 100%)" }} />
                      </motion.div>
                    )}
                  </motion.button>
                )
              })}
              <div className="absolute bottom-0 left-0 right-0 pointer-events-none"
                style={{ height: 1, background: "linear-gradient(to right, transparent, rgba(255,255,255,0.06), transparent)" }} />
            </div>

            {/* Bell + Avatar */}
            <div className="flex items-center gap-3 flex-shrink-0 mr-4">
              <motion.div whileHover={{ scale: 1.15, rotate: 10 }} whileTap={{ scale: 0.9 }} className="relative cursor-pointer">
                <Bell size={16} style={{ color: "rgba(255,255,255,0.45)" }} />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#FF6B4A]" />
              </motion.div>
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
            style={{ scrollbarWidth: "none", paddingLeft: 80, paddingRight: 80 }}>

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
                        <GameCard game={game} price={prices[game.id] ?? null}
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
                    prices={prices}
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
                    prices={prices}
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
                        prices={prices}
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
                      prices={prices}
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
                        <div className="flex overflow-x-auto pb-3" style={{ gap: 36, scrollbarWidth: "none" }}>
                          {games.map((game, i) => (
                            <motion.div key={game.id}
                              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: delay + i * 0.035, duration: 0.45, ease: "easeOut" }}>
                              <GameCard game={game} rank={i + 1} price={prices[game.id] ?? null}
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
                            <GameCard game={game} rank={i + 1} price={prices[game.id] ?? null}
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
