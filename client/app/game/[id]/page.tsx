"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft, Heart, Home, BellRing, Search as SearchIcon,
  Users, User, LogIn, ExternalLink, Clock, Tag,
} from "lucide-react"
import { getGameById, getGameDeals } from "@/lib/api/games"
import { addToWishlist, removeFromWishlist, getWishlist } from "@/lib/api/wishlist"
import { useAuth } from "@/context/AuthContext"
import { BackgroundGradientAnimation } from "@/components/ui/BackgroundGradientAnimation"
import type { Game, PriceResult } from "@/types/game"

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTH_NAV = new Set(["Notifications", "Friends", "Profile"])

const NAV = [
  { icon: Home,        label: "Home",          href: "/"              },
  { icon: BellRing,    label: "Notifications",  href: "/notifications" },
  { icon: SearchIcon,  label: "Search",         href: "/search"        },
  { icon: Users,       label: "Friends",        href: "/friends"       },
  { icon: User,        label: "Profile",        href: "/profile"       },
] as const

// ─── Styles ───────────────────────────────────────────────────────────────────

const glassStyle = {
  background:           "rgba(30, 38, 51, 0.40)",
  backdropFilter:       "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
} as const

const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 16 },
  animate:    { opacity: 1, y: 0  },
  transition: { duration: 0.45, ease: "easeOut", delay },
})

// ─── NavGlowItem ──────────────────────────────────────────────────────────────

function NavGlowItem({
  icon: Icon, label, active, locked, delay, onClick,
}: {
  icon:    React.ElementType
  label:   string
  active:  boolean
  locked:  boolean
  delay:   number
  onClick: () => void
}) {
  const ref                   = useRef<HTMLButtonElement>(null)
  const [pos, setPos]         = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState(false)

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
      className="w-full flex items-center gap-3 px-3 py-2.5 mb-0.5 text-sm font-medium relative overflow-hidden"
      style={{
        borderRadius: 10,
        color:   active  ? "#48BCF9"
               : locked  ? "rgba(255,255,255,0.25)"
               : hovered ? "#48BCF9"
               : "rgba(255,255,255,0.45)",
        background: active ? "rgba(52,82,229,0.13)" : "transparent",
        border: "none",
        cursor: "pointer",
        transition: "color 0.25s",
      }}
    >
      {active && (
        <motion.div
          layoutId="nav-indicator-detail"
          className="absolute left-0 top-1/2 -translate-y-1/2"
          style={{ width: 3, height: 20, background: "#48BCF9", borderRadius: "0 4px 4px 0" }}
        />
      )}
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
      <span style={{ position: "relative", zIndex: 1 }}>{label}</span>
      {locked && (
        <span
          className="ml-auto text-[8px] px-1 py-0.5 rounded"
          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.2)", position: "relative", zIndex: 1 }}
        >
          Login
        </span>
      )}
    </motion.button>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ activeNav, onNav, isLoggedIn, onLogout }: {
  activeNav:  string
  onNav:      (label: string, href: string) => void
  isLoggedIn: boolean
  onLogout:   () => void
}) {
  const router = useRouter()
  return (
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
        {NAV.map(({ icon, label, href }, i) => (
          <NavGlowItem
            key={label}
            icon={icon}
            label={label}
            active={activeNav === label}
            locked={!isLoggedIn && AUTH_NAV.has(label)}
            delay={0.1 + i * 0.05}
            onClick={() => onNav(label, href)}
          />
        ))}
      </div>

      <div className="flex-1" />

      {isLoggedIn ? (
        <motion.button {...fadeUp(0.45)} onClick={onLogout}
          whileHover={{ x: 4 }} whileTap={{ scale: 0.97 }}
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
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Shorten RAWG platform name to a short label for pills */
function shortPlatform(platform: string): string {
  const p = platform.toLowerCase()
  if (p.includes("playstation") || p.includes("ps5") || p.includes("ps4") || p.includes("ps3")) return "PlayStation"
  if (p.includes("xbox"))       return "Xbox"
  if (p.includes("nintendo") || p.includes("switch")) return "Nintendo Switch"
  if (p.includes("pc") || p.includes("windows"))      return "PC"
  if (p.includes("linux"))  return "Linux"
  if (p.includes("mac"))    return "macOS"
  if (p.includes("ios") || p.includes("iphone"))      return "iOS"
  if (p.includes("android")) return "Android"
  return platform
}

/** How many days until the deal "expires" — we use 30d as placeholder since CheapShark has no end date */
function daysLeft(savings: number): number {
  // Map savings % to a plausible days-remaining window (pure visual)
  return Math.max(1, Math.round(30 - savings * 0.2))
}

/** Format date range for an event card — e.g. "May 1 – Jun 1" */
function eventDateRange(savings: number): string {
  const now   = new Date()
  const start = new Date(now); start.setDate(start.getDate() - Math.round(savings * 0.1))
  const end   = new Date(now); end.setDate(end.getDate() + daysLeft(savings))
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  return `${fmt(start)} – ${fmt(end)}`
}

// ─── EventCard (active deal) ──────────────────────────────────────────────────

function EventCard({ deal, game }: { deal: PriceResult; game: Game }) {
  const days = daysLeft(deal.savings)
  return (
    <motion.a
      href={deal.dealLink}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0  }}
      whileHover={{ y: -2, transition: { duration: 0.18 } }}
      className="block rounded-[16px] overflow-hidden relative group"
      style={{
        background:           "rgba(28,30,42,0.80)",
        border:               "1px solid rgba(255,255,255,0.06)",
        backdropFilter:       "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      {/* Top cover strip */}
      <div className="relative h-28 overflow-hidden">
        {game.cover ? (
          <img
            src={game.cover}
            alt={game.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div style={{ background: "linear-gradient(135deg,#1c2a3a,#2a1c3a)", height: "100%" }} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(28,30,42,0.95) 0%, transparent 60%)" }} />

        {/* Days left badge */}
        <div
          className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-[11px] font-bold"
          style={{ background: "rgba(174,59,214,0.85)", backdropFilter: "blur(4px)" }}
        >
          <Clock size={10} />
          {days}d left
        </div>

        {/* Store icon */}
        {deal.storeIcon && (
          <img src={deal.storeIcon} alt={deal.storeName} className="absolute bottom-3 left-3 w-6 h-6 object-contain" />
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <p className="text-[9px] font-bold tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>
          {eventDateRange(deal.savings).toUpperCase()}
        </p>
        <p className="text-white font-semibold text-sm leading-tight truncate">{game.name} — {deal.storeName}</p>
        <p className="text-[11px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
          {Math.round(deal.savings)}% off · Sale ends soon
        </p>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            {parseFloat(deal.normalPrice) > parseFloat(deal.salePrice) && (
              <span className="text-[#9fa0a1] text-xs line-through">${deal.normalPrice}</span>
            )}
            <span className="text-white font-bold text-sm">
              {parseFloat(deal.salePrice) === 0 ? "FREE" : `$${deal.salePrice}`}
            </span>
          </div>
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(91,222,138,0.15)", color: "#5BDE8A" }}
          >
            -{Math.round(deal.savings)}%
          </span>
        </div>
      </div>
    </motion.a>
  )
}

// ─── MissedCard (expired deal) ────────────────────────────────────────────────

function MissedCard({ deal, game }: { deal: PriceResult; game: Game }) {
  return (
    <div
      className="flex items-center gap-3 rounded-[14px] px-4 py-3"
      style={{
        background:           "rgba(28,30,42,0.60)",
        border:               "1px solid rgba(255,255,255,0.04)",
        backdropFilter:       "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      {/* Cover thumb */}
      <div className="relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden">
        {game.cover ? (
          <img src={game.cover} alt={game.name} className="w-full h-full object-cover opacity-50 grayscale" />
        ) : (
          <div className="w-full h-12 bg-[#2a2d32]" />
        )}
        {deal.storeIcon && (
          <img src={deal.storeIcon} alt={deal.storeName} className="absolute bottom-0.5 right-0.5 w-4 h-4 object-contain" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-white text-[12px] font-semibold truncate">{deal.storeName}</p>
        <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>was ${deal.normalPrice}</p>
      </div>

      <span
        className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}
      >
        Expired
      </span>
    </div>
  )
}

// ─── DiscountRow ──────────────────────────────────────────────────────────────

function DiscountRow({ deal }: { deal: PriceResult }) {
  return (
    <motion.a
      href={deal.dealLink}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 2, transition: { duration: 0.15 } }}
      className="flex items-center justify-between rounded-[14px] px-4 py-3 group"
      style={{
        background:           "rgba(28,30,42,0.70)",
        border:               "1px solid rgba(255,255,255,0.05)",
        backdropFilter:       "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        transition:           "border-color 0.2s",
      }}
    >
      <div className="flex items-center gap-3">
        {deal.storeIcon ? (
          <img src={deal.storeIcon} alt={deal.storeName} className="w-6 h-6 object-contain" />
        ) : (
          <div className="w-6 h-6 rounded bg-[#2a2d32]" />
        )}
        <span className="text-white text-sm font-semibold">{deal.storeName}</span>
      </div>

      <div className="flex items-center gap-2.5">
        {deal.savings > 0 && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(91,222,138,0.15)", color: "#5BDE8A" }}
          >
            -{Math.round(deal.savings)}%
          </span>
        )}
        {parseFloat(deal.normalPrice) > parseFloat(deal.salePrice) && (
          <span className="text-[#9fa0a1] text-xs line-through">${deal.normalPrice}</span>
        )}
        <span className="text-white font-bold text-sm">
          {parseFloat(deal.salePrice) === 0 ? "FREE" : `$${deal.salePrice}`}
        </span>
        <ExternalLink size={12} className="text-[#9fa0a1] group-hover:text-[#AE3BD6] transition-colors" />
      </div>
    </motion.a>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GameDetailPage() {
  const { id }             = useParams<{ id: string }>()
  const router             = useRouter()
  const { user, logout }   = useAuth()
  const isLoggedIn         = !!user

  const [game,         setGame]         = useState<Game | null>(null)
  const [deals,        setDeals]        = useState<PriceResult[]>([])
  const [loadingGame,  setLoadingGame]  = useState(true)
  const [loadingDeals, setLoadingDeals] = useState(true)
  const [tab,          setTab]          = useState<"Events" | "Discounts">("Events")
  const [inWishlist,   setInWishlist]   = useState(false)
  const [wishlistBusy, setWishlistBusy] = useState(false)

  // Load game + deals
  useEffect(() => {
    if (!id) return
    setLoadingGame(true)
    getGameById(id)
      .then(g => {
        setGame(g)
        setLoadingDeals(true)
        getGameDeals(g.name)
          .then(setDeals)
          .catch(() => setDeals([]))
          .finally(() => setLoadingDeals(false))
      })
      .catch(() => router.push("/"))
      .finally(() => setLoadingGame(false))
  }, [id])

  // Load wishlist to check if this game is saved
  useEffect(() => {
    if (!isLoggedIn || !id) return
    getWishlist()
      .then(list => setInWishlist(list.some((w: { gameId: string }) => w.gameId === id)))
      .catch(() => {})
  }, [isLoggedIn, id])

  const handleToggleWishlist = async () => {
    if (!isLoggedIn) { router.push("/login"); return }
    if (!game || wishlistBusy) return
    setWishlistBusy(true)
    try {
      if (inWishlist) {
        await removeFromWishlist(String(game.id))
        setInWishlist(false)
      } else {
        await addToWishlist({ gameId: String(game.id), gameName: game.name, gameCover: game.cover, gameSlug: game.slug })
        setInWishlist(true)
      }
    } catch { /* silent */ }
    finally { setWishlistBusy(false) }
  }

  const handleNav = (label: string, href: string) => {
    if (!isLoggedIn && AUTH_NAV.has(label)) { router.push("/login"); return }
    router.push(href)
  }

  // Split deals: active (savings > 0) vs already missed (savings = 0 or at normal price)
  const activeDeals = deals.filter(d => d.savings > 2)
  const missedDeals = deals.filter(d => d.savings <= 2)
  // Cheapest deal link
  const cheapestDeal = deals.length > 0 ? deals.reduce((a, b) => parseFloat(a.salePrice) <= parseFloat(b.salePrice) ? a : b) : null

  if (loadingGame) return <PageSkeleton />

  if (!game) return null

  return (
    <main className="relative w-screen h-screen overflow-hidden" style={{ background: "#12131A" }}>
      <BackgroundGradientAnimation />
      <img
        src="/icons/auth-bg-top.svg"
        aria-hidden
        className="absolute inset-0 w-full h-full pointer-events-none object-cover"
        style={{ zIndex: 2 }}
      />

      <div className="relative flex h-full" style={{ zIndex: 3 }}>

        {/* ══ SIDEBAR ══ */}
        <Sidebar
          activeNav="Home"
          onNav={handleNav}
          isLoggedIn={isLoggedIn}
          onLogout={logout}
        />

        {/* ══ MAIN CONTENT ══ */}
        <div className="flex flex-1 min-w-0 h-full overflow-hidden gap-5 px-6 py-5">

          {/* ── LEFT PANEL ── */}
          <motion.div
            {...fadeUp(0.08)}
            className="flex flex-col flex-shrink-0 overflow-y-auto"
            style={{ width: 460, scrollbarWidth: "none" }}
          >
            {/* Back button — above the cover */}
            <motion.button
              onClick={() => router.back()}
              whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 mb-3 text-sm font-medium"
              style={{ color: "rgba(255,255,255,0.55)", alignSelf: "flex-start" }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background:           "rgba(42,45,50,0.60)",
                  backdropFilter:       "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                  border:               "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <ArrowLeft size={15} className="text-white" />
              </div>
              <span>Back</span>
            </motion.button>

            {/* Cover card — full panel width */}
            <div className="relative rounded-[10px] overflow-hidden mb-4 flex-shrink-0" style={{ height: 280 }}>
              {game.cover ? (
                <img src={game.cover} alt={game.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full" style={{ background: "linear-gradient(135deg,#1c2a3a,#2a1c3a)" }} />
              )}
              {/* Gradient overlay for bottom info */}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(18,19,26,0.92) 0%, rgba(18,19,26,0.3) 50%, transparent 100%)" }}
              />

              {/* Top-right buttons: external link + favorite */}
              <div className="absolute top-3 right-3 flex gap-2">
                {cheapestDeal && (
                  <a
                    href={cheapestDeal.dealLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center"
                    style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: "rgba(0,0,0,0.5)",
                    }}
                  >
                    <ExternalLink size={14} className="text-[#B3BADE]" />
                  </a>
                )}
                <motion.button
                  onClick={handleToggleWishlist}
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  className="flex items-center justify-center"
                  style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "rgba(0,0,0,0.5)",
                    opacity: wishlistBusy ? 0.5 : 1,
                  }}
                >
                  <Heart
                    size={14}
                    className={inWishlist ? "fill-current" : ""}
                    style={{ color: inWishlist ? "#AE3BD6" : "#B3BADE" }}
                  />
                </motion.button>
              </div>

              {/* Bottom: title + rating + metacritic + year */}
              <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
                <h1 className="text-white font-bold text-xl leading-tight mb-1">{game.name}</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  {game.rating > 0 && (
                    <span className="text-[12px] font-bold" style={{ color: "#AE3BD6" }}>★ {game.rating.toFixed(1)}</span>
                  )}
                  {game.metacritic && (
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: "#44d62c", color: "#000" }}>
                      MC {game.metacritic}
                    </span>
                  )}
                  {game.released && (
                    <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>{game.released.slice(0, 4)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Platform pills — dark style matching Figma #2A2D32 */}
            {game.platforms.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {[...new Set(game.platforms.map(shortPlatform))].slice(0, 5).map(p => (
                  <span
                    key={p}
                    className="text-[11px] font-semibold px-3 py-1.5"
                    style={{
                      background:   "#2A2D32",
                      color:        "#B3BADE",
                      borderRadius: 6,
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            )}

            {/* Platform dot-separated list */}
            {game.platforms.length > 0 && (
              <p className="text-[11px] mb-4 leading-relaxed" style={{ color: "#9FA0A1" }}>
                {game.platforms.join(" · ")}
              </p>
            )}

            {/* Friend circles — 5 colorful circles */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex -space-x-2">
                {[
                  { letter: "A", color: "#6475D1" },
                  { letter: "M", color: "#AE3BD6" },
                  { letter: "J", color: "#44D62C" },
                  { letter: "S", color: "#2AB7E6" },
                  { letter: "K", color: "#E67C2A" },
                ].map(({ letter, color }) => (
                  <div
                    key={letter}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white border-2"
                    style={{ background: color, borderColor: "#12131A" }}
                  >
                    {letter}
                  </div>
                ))}
              </div>
              <span className="text-[12px]" style={{ color: "#9FA0A1" }}>5 friends playing</span>
            </div>

            {/* Visit Store button — solid #6475D1 */}
            {cheapestDeal && (
              <motion.a
                href={cheapestDeal.dealLink}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ brightness: 1.1, scale: 1.01 } as never}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-2 rounded-[12px] py-3 mb-5 text-white font-semibold text-sm"
                style={{
                  background: "#6475D1",
                  boxShadow:  "0 4px 16px rgba(100,117,209,0.35)",
                }}
              >
                Buy {game.name} on {cheapestDeal.storeName}
                <ExternalLink size={13} />
              </motion.a>
            )}

            {/* Genre pills */}
            {game.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {game.genres.map(g => (
                  <span
                    key={g}
                    className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                    style={{
                      background: "rgba(100,117,209,0.15)",
                      color:      "#B3BADE",
                      border:     "1px solid rgba(100,117,209,0.25)",
                    }}
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* About */}
            {game.description && (
              <div>
                <p className="text-[10px] font-bold tracking-[0.1em] mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>ABOUT</p>
                <p className="text-[12px] leading-relaxed" style={{ color: "#9FA0A1" }}>
                  {game.description.slice(0, 400)}{game.description.length > 400 ? "…" : ""}
                </p>
              </div>
            )}
          </motion.div>

          {/* ── RIGHT PANEL ── */}
          <motion.div
            {...fadeUp(0.15)}
            className="flex flex-col flex-1 min-w-0 overflow-hidden"
          >
            {/* Tab switcher */}
            <div
              className="flex flex-shrink-0 mb-5 p-1 gap-1"
              style={{
                ...glassStyle,
                borderRadius: 12,
                border:       "1px solid rgba(255,255,255,0.06)",
                alignSelf:    "flex-start",
              }}
            >
              {(["Events", "Discounts"] as const).map(t => (
                <motion.button
                  key={t}
                  onClick={() => setTab(t)}
                  whileTap={{ scale: 0.96 }}
                  className="px-5 py-1.5 text-sm font-semibold"
                  style={{
                    borderRadius: 9,
                    background:   tab === t ? "rgba(174,59,214,0.22)" : "transparent",
                    color:        tab === t ? "#CF6EF5"               : "rgba(255,255,255,0.4)",
                    border:       tab === t ? "1px solid rgba(174,59,214,0.35)" : "1px solid transparent",
                    transition:   "all 0.2s",
                  }}
                >
                  {t}
                </motion.button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto pr-1" style={{ scrollbarWidth: "none" }}>
              <AnimatePresence mode="wait">
                {tab === "Events" ? (
                  <motion.div
                    key="events"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {loadingDeals ? (
                      <EventsSkeleton />
                    ) : activeDeals.length === 0 && missedDeals.length === 0 ? (
                      <EmptyDeals />
                    ) : (
                      <>
                        {/* Active events */}
                        {activeDeals.length > 0 && (
                          <>
                            <p className="text-[9px] font-bold tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.25)" }}>
                              ACTIVE EVENTS
                            </p>
                            <div className="grid grid-cols-2 gap-3 mb-6">
                              {activeDeals.slice(0, 6).map(deal => (
                                <EventCard key={deal.dealID} deal={deal} game={game} />
                              ))}
                            </div>
                          </>
                        )}

                        {/* Already missed */}
                        {missedDeals.length > 0 && (
                          <>
                            <p className="text-[9px] font-bold tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.25)" }}>
                              ALREADY MISSED
                            </p>
                            <div className="flex flex-col gap-2">
                              {missedDeals.slice(0, 4).map(deal => (
                                <MissedCard key={deal.dealID} deal={deal} game={game} />
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="discounts"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {loadingDeals ? (
                      <DiscountsSkeleton />
                    ) : deals.length === 0 ? (
                      <EmptyDeals />
                    ) : (
                      <>
                        <p className="text-[9px] font-bold tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.25)" }}>
                          BEST PRICES RIGHT NOW
                        </p>
                        <div className="flex flex-col gap-2">
                          {deals.map(deal => (
                            <DiscountRow key={deal.dealID} deal={deal} />
                          ))}
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

        </div>
      </div>
    </main>
  )
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function EventsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-52 rounded-[16px] bg-[#1c1e2a] animate-pulse" />
      ))}
    </div>
  )
}

function DiscountsSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-14 rounded-[14px] bg-[#1c1e2a] animate-pulse" />
      ))}
    </div>
  )
}

function EmptyDeals() {
  return (
    <div
      className="rounded-[16px] p-8 text-center"
      style={{ background: "rgba(28,30,42,0.60)", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      <Tag size={28} className="mx-auto mb-3 opacity-30 text-white" />
      <p className="text-white font-semibold text-sm mb-1">No deals found</p>
      <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.35)" }}>
        This game may be console-exclusive or not tracked by CheapShark yet.
      </p>
    </div>
  )
}

function PageSkeleton() {
  return (
    <main className="relative w-screen h-screen overflow-hidden flex" style={{ background: "#12131A" }}>
      <div className="w-60 h-full bg-[#1a1d28] animate-pulse" />
      <div className="flex flex-1 gap-5 px-6 py-5">
        <div className="w-[460px] flex flex-col gap-4">
          <div className="h-8 w-20 rounded bg-[#1c1e2a] animate-pulse" />
          <div className="h-48 rounded-[16px] bg-[#1c1e2a] animate-pulse" />
          <div className="h-24 rounded bg-[#1c1e2a] animate-pulse" />
        </div>
        <div className="flex-1 flex flex-col gap-3">
          <div className="h-10 w-48 rounded-[12px] bg-[#1c1e2a] animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-52 rounded-[16px] bg-[#1c1e2a] animate-pulse" />)}
          </div>
        </div>
      </div>
    </main>
  )
}
