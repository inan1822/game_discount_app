"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft, Heart, Home, BellRing, Search as SearchIcon,
  Users, User, LogIn, ExternalLink, Tag, Zap, Calendar, Monitor,
} from "lucide-react"
import { getGameById, getGameDeals, getGameDlcDeals, getGameGiveaways, getGameEvents } from "@/lib/api/games"
import { addToWishlist, removeFromWishlist, getWishlist } from "@/lib/api/wishlist"
import { useAuth } from "@/context/AuthContext"
import { BackgroundGradientAnimation } from "@/components/ui/BackgroundGradientAnimation"
import type { Game, PriceResult, GiveawayItem, GameEvent } from "@/types/game"

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
        const r = ref.current?.getBoundingClientRect()
        if (!r) return
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
  if (p.includes("xbox"))                                    return "Xbox"
  if (p.includes("nintendo") || p.includes("switch"))       return "Nintendo Switch"
  if (p.includes("pc") || p.includes("windows"))            return "PC"
  if (p.includes("linux"))   return "Linux"
  if (p.includes("mac"))     return "macOS"
  if (p.includes("ios") || p.includes("iphone"))            return "iOS"
  if (p.includes("android")) return "Android"
  return platform
}

/** Relative time label — "2 hours ago", "3 days ago", etc. */
function relativeTime(unixSeconds: number): string {
  const diff = Date.now() / 1000 - unixSeconds
  if (diff < 3600)   return `${Math.max(1, Math.round(diff / 60))}m ago`
  if (diff < 86400)  return `${Math.round(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.round(diff / 86400)}d ago`
  const d = new Date(unixSeconds * 1000)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// ─── SteamEventCard ───────────────────────────────────────────────────────────

function SteamEventCard({ event }: { event: GameEvent }) {
  const isUpdate = event.feedLabel.toLowerCase().includes("update") ||
                   event.feedLabel.toLowerCase().includes("patch")

  return (
    <motion.a
      href={event.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.16 } }}
      className="block rounded-[16px] overflow-hidden relative group"
      style={{
        background:           "rgba(28,30,42,0.80)",
        border:               "1px solid rgba(255,255,255,0.06)",
        backdropFilter:       "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      {/* Feed-type badge */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <span
          className="text-[9px] font-bold tracking-widest px-2 py-0.5 rounded-full"
          style={{
            background: isUpdate
              ? "rgba(72,188,249,0.12)"
              : "rgba(174,59,214,0.12)",
            color: isUpdate ? "#48BCF9" : "#CF6EF5",
          }}
        >
          {event.feedLabel.toUpperCase()}
        </span>
        <span className="text-[10px] flex items-center gap-1" style={{ color: "rgba(255,255,255,0.3)" }}>
          <Calendar size={9} />
          {relativeTime(event.date)}
        </span>
      </div>

      {/* Title */}
      <div className="px-4 pb-2">
        <p className="text-white font-semibold text-[13px] leading-snug line-clamp-2 group-hover:text-[#CF6EF5] transition-colors">
          {event.title}
        </p>
      </div>

      {/* Summary excerpt */}
      {event.summary && (
        <div className="px-4 pb-3">
          <p className="text-[11px] leading-relaxed line-clamp-3" style={{ color: "rgba(255,255,255,0.38)" }}>
            {event.summary}
          </p>
        </div>
      )}

      {/* Footer */}
      <div
        className="px-4 py-2.5 flex items-center justify-between"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
          {event.author || "Steam"}
        </span>
        <span className="text-[10px] flex items-center gap-1" style={{ color: "rgba(174,59,214,0.7)" }}>
          Read more <ExternalLink size={9} />
        </span>
      </div>
    </motion.a>
  )
}

// ─── GiveawayRow ─────────────────────────────────────────────────────────────

function GiveawayRow({ giveaway }: { giveaway: GiveawayItem }) {
  const hasWorth  = giveaway.worth && giveaway.worth !== "$0.00"
  const hasExpiry = giveaway.endDate && giveaway.endDate !== "N/A"

  return (
    <motion.a
      href={giveaway.claimUrl}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 2, transition: { duration: 0.15 } }}
      className="flex items-center justify-between rounded-[14px] px-4 py-3 group"
      style={{
        background:           "rgba(28,42,35,0.75)",
        border:               "1px solid rgba(91,222,138,0.18)",
        backdropFilter:       "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Gift icon bubble */}
        <div
          className="flex items-center justify-center flex-shrink-0 text-base"
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(91,222,138,0.12)",
            border:     "1px solid rgba(91,222,138,0.2)",
          }}
        >
          🎁
        </div>

        <div className="min-w-0">
          <p className="text-white text-[12px] font-semibold truncate leading-tight">
            {giveaway.title}
          </p>
          <p className="text-[10px] truncate mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
            {giveaway.platforms}
            {hasExpiry && (
              <span className="ml-1.5" style={{ color: "rgba(255,200,80,0.75)" }}>
                · Ends {new Date(giveaway.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        {hasWorth && (
          <span className="text-[10px] line-through" style={{ color: "rgba(255,255,255,0.3)" }}>
            {giveaway.worth}
          </span>
        )}
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: "rgba(91,222,138,0.18)", color: "#5BDE8A" }}
        >
          FREE
        </span>
        <ExternalLink size={11} className="text-[#5BDE8A] opacity-60 group-hover:opacity-100 transition-opacity" />
      </div>
    </motion.a>
  )
}

// ─── Store icon fallbacks ─────────────────────────────────────────────────────
// CheapShark only has icons for PC stores it tracks. ITAD returns many more
// stores (Xbox, Nintendo, PlayStation, etc.) that need hardcoded icon URLs.
// Google's favicon service is reliable for any domain — sz=128 gives a crisp icon
const G = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`

const STORE_ICON_FALLBACKS: Record<string, string> = {
  // Microsoft / Xbox
  "microsoft store":   G("microsoft.com"),
  "xbox":              G("xbox.com"),
  // Nintendo
  "nintendo eshop":    G("nintendo.com"),
  "nintendo":          G("nintendo.com"),
  // PlayStation
  "playstation store": G("store.playstation.com"),
  "playstation":       G("store.playstation.com"),
  // Epic (ITAD name differs slightly from CheapShark)
  "epic game store":   G("epicgames.com"),
  "epic games store":  G("epicgames.com"),
  "epic games":        G("epicgames.com"),
  // Key / gift-card resellers (used across Xbox, Nintendo, and PS filters)
  "cdkeys":            G("cdkeys.com"),
  "eneba":             G("eneba.com"),
  "g2a":               G("g2a.com"),
  "kinguin":           G("kinguin.net"),
  // Other stores commonly missing icons
  "gamesplanet us":    G("us.gamesplanet.com"),
  "gamesplanet uk":    G("uk.gamesplanet.com"),
  "gamesplanet fr":    G("fr.gamesplanet.com"),
  "gamesplanet de":    G("de.gamesplanet.com"),
  "gamesload":         G("gamesload.com"),
  "allyouplay":        G("allyouplay.com"),
  "gamebillet":        G("gamebillet.com"),
}

function resolveStoreIcon(storeName: string, storeIcon: string): string {
  if (storeIcon) return storeIcon
  return STORE_ICON_FALLBACKS[storeName.toLowerCase()] ?? ""
}

// ─── DiscountRow ──────────────────────────────────────────────────────────────
// Each row = one store. href goes directly to that store's page for this game.
// For ITAD deals: direct store URL (e.g. store.steampowered.com/app/105600/).
// For Steam fallback: direct store.steampowered.com/app/{id}/ link.
// For CheapShark (non-Steam only): cheapshark.com/redirect?dealID=xxx.

function DiscountRow({ deal, isCheapest }: { deal: PriceResult; isCheapest: boolean }) {
  const isFree    = parseFloat(deal.salePrice) === 0
  const hasSaving = deal.savings > 0
  const hasNormal = parseFloat(deal.normalPrice) > parseFloat(deal.salePrice)
  // G2A platform deals return a price range (cheapest seller → priciest seller)
  const hasRange  = deal.salePrice !== "N/A" &&
                    deal.salePrice !== "0.00" &&
                    deal.normalPrice !== "N/A" &&
                    deal.normalPrice !== "0.00" &&
                    deal.normalPrice !== deal.salePrice &&
                    parseFloat(deal.normalPrice) > parseFloat(deal.salePrice)

  return (
    <motion.a
      href={deal.dealLink}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 2, transition: { duration: 0.15 } }}
      className="flex items-center gap-3 rounded-[14px] px-4 py-3 group"
      style={{
        background:           isCheapest
          ? "rgba(100,117,209,0.10)"
          : "rgba(28,30,42,0.70)",
        border:               isCheapest
          ? "1px solid rgba(100,117,209,0.28)"
          : "1px solid rgba(255,255,255,0.05)",
        backdropFilter:       "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      {/* Store icon */}
      {resolveStoreIcon(deal.storeName, deal.storeIcon) ? (
        <img
          src={resolveStoreIcon(deal.storeName, deal.storeIcon)}
          alt={deal.storeName}
          className="w-7 h-7 object-contain flex-shrink-0 rounded"
        />
      ) : (
        <div className="w-7 h-7 rounded bg-[#2a2d32] flex-shrink-0 flex items-center justify-center">
          <span className="text-[10px] font-bold text-white/40">
            {deal.storeName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Store name + "Best Deal" badge */}
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-semibold truncate">{deal.storeName}</span>
          {isCheapest && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: "rgba(100,117,209,0.25)", color: "#8899E8" }}
            >
              BEST DEAL
            </span>
          )}
        </div>
        {/* DLC name — shown only on rows returned from /games/dlc-deals */}
        {deal.dlcName && (
          <span
            className="text-[10px] truncate"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            DLC · {deal.dlcName}
          </span>
        )}
        {/* PSN wallet vouchers (gift cards sub-section) */}
        {(deal.storeID === "cdkeys-psn"  || deal.storeID === "eneba-psn"   ||
          deal.storeID === "g2a-psn"     || deal.storeID === "kinguin-psn" ||
          deal.storeID === "g2a-ps") && (
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            PSN wallet vouchers · add funds, buy from PS Store
          </span>
        )}
        {deal.storeID === "ps-search" && (
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            Search directly on PlayStation Store
          </span>
        )}
        {/* Real G2A platform deals — price range, multiple sellers */}
        {(deal.storeID === "g2a-pc" || deal.storeID === "g2a-xbox" || deal.storeID === "g2a-switch") && (
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            Third-party marketplace · multiple sellers, prices vary by region
          </span>
        )}
        {/* Synthetic key-market search entries (Xbox / Nintendo) */}
        {deal.storeID === "kinguin-xbox" && (
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            Xbox game keys · activate on Xbox / Microsoft Store
          </span>
        )}
        {deal.storeID === "kinguin-switch" && (
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            Nintendo Switch game keys · add funds or activate directly
          </span>
        )}
        {/* PC store search fallbacks */}
        {(deal.storeID === "steam-search" || deal.storeID === "gog-search" || deal.storeID === "epic-search") && (
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            Search directly on this store
          </span>
        )}
        {(deal.storeID === "g2a-pc-search" || deal.storeID === "kinguin-pc-search") && (
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            PC game keys · compare offers before buying
          </span>
        )}
        {hasNormal &&
          !deal.storeID.startsWith("cdkeys-") &&
          !deal.storeID.startsWith("eneba-")  &&
          !deal.storeID.startsWith("g2a-")    &&
          !deal.storeID.startsWith("kinguin-") &&
          deal.storeID !== "ps-search"         && (
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            Regular: ${deal.normalPrice}
          </span>
        )}
      </div>

      {/* Price + savings + link arrow */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
        {hasSaving && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(91,222,138,0.15)", color: "#5BDE8A" }}
          >
            -{Math.round(deal.savings)}%
          </span>
        )}
        <span className="text-white font-bold text-sm min-w-[48px] text-right">
          {isFree
            ? "FREE"
            : deal.salePrice === "N/A" || deal.salePrice === "0.00"
            ? <span style={{ color: "rgba(255,255,255,0.35)", fontWeight: 500, fontSize: 11 }}>View →</span>
            : hasRange
            ? <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.9)", letterSpacing: "-0.01em" }}>${deal.salePrice} — ${deal.normalPrice}</span>
            : `$${deal.salePrice}`}
        </span>
        <ExternalLink
          size={13}
          className="transition-colors"
          style={{ color: isCheapest ? "#8899E8" : "rgba(255,255,255,0.3)" }}
        />
      </div>
    </motion.a>
  )
}

// ─── ConsoleButtons ───────────────────────────────────────────────────────────
// Toggleable platform-filter chips. Clicking PC/Xbox/Nintendo/PlayStation narrows
// the "WHERE TO BUY" list below to only that platform's deals (plus a synthetic
// "Store Search" link so users always have somewhere to click).
// Clicking the same chip again clears the filter (back to all stores).
export type ConsolePlatform = "pc" | "xbox" | "switch" | "ps"

// Button definition uses either an image URL or a React node (for lucide icons).
type PlatformButton = {
  key: ConsolePlatform
  label: string
  icon: string | React.ReactNode
  available: boolean
}

// Shared platform detection — used by both ConsoleButtons (rendering) and
// GameDetailPage (auto-fallback when PC isn't available for the game).
function detectAvailablePlatforms(platforms: string[]) {
  return {
    pc: platforms.some(p => {
      const lp = p.toLowerCase()
      return lp === "pc" || lp.includes("pc ") || lp.includes("windows") || lp.includes("linux") || lp.includes("mac")
    }),
    xbox:   platforms.some(p => p.toLowerCase().includes("xbox")),
    switch: platforms.some(p => p.toLowerCase().includes("nintendo")),
    ps:     platforms.some(p => p.toLowerCase().includes("playstation")),
  }
}

function ConsoleButtons({ platforms, selected, onSelect, dlcOnly, onToggleDlc, dlcAvailable }: {
  platforms: string[]
  selected: ConsolePlatform
  onSelect: (p: ConsolePlatform) => void
  dlcOnly: boolean
  onToggleDlc: () => void
  /** false = no Steam AppID → toggle is disabled (DLC list requires Steam). */
  dlcAvailable: boolean
}) {
  const avail = detectAvailablePlatforms(platforms)

  // Always render all 4 platform buttons. Unsupported platforms are dimmed and
  // non-clickable so the layout stays consistent across every game page.
  const buttons: PlatformButton[] = [
    { key: "pc",     label: "PC",              icon: <Monitor size={22} strokeWidth={2} className="text-white/80" />, available: avail.pc     },
    { key: "xbox",   label: "Xbox",            icon: STORE_ICON_FALLBACKS["xbox"],                                    available: avail.xbox   },
    { key: "switch", label: "Nintendo Switch", icon: STORE_ICON_FALLBACKS["nintendo"],                                available: avail.switch },
    { key: "ps",     label: "PlayStation",     icon: STORE_ICON_FALLBACKS["playstation"],                             available: avail.ps     },
  ]

  const availableCount = buttons.filter(b => b.available).length

  return (
    <>
      <div className="flex items-center justify-between mb-3 gap-3">
        <p
          className="text-[9px] font-bold tracking-widest"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          FILTER BY CONSOLE · {availableCount} PLATFORM{availableCount === 1 ? "" : "S"}
        </p>
        {/* DLC-only toggle — when ON, deals list shows discounts on DLCs only.
            Disabled (dimmed) for games with no Steam AppID, since the DLC list
            is sourced from Steam appdetails. */}
        <motion.button
          type="button"
          onClick={onToggleDlc}
          disabled={!dlcAvailable}
          whileHover={dlcAvailable ? { scale: 1.03 } : undefined}
          whileTap={dlcAvailable ? { scale: 0.97 } : undefined}
          title={dlcAvailable
            ? (dlcOnly ? "Showing DLC discounts — click to switch back" : "Show only DLC discounts")
            : "DLC discounts require a Steam-listed game"}
          className="flex items-center gap-2 rounded-full px-3 py-1 text-[9px] font-bold tracking-widest flex-shrink-0"
          style={{
            background: dlcOnly
              ? "rgba(100,117,209,0.18)"
              : "rgba(28,30,42,0.70)",
            border: dlcOnly
              ? "1px solid rgba(100,117,209,0.45)"
              : "1px solid rgba(255,255,255,0.07)",
            color: dlcOnly ? "#8899E8" : "rgba(255,255,255,0.45)",
            opacity: dlcAvailable ? 1 : 0.4,
            cursor: dlcAvailable ? "pointer" : "not-allowed",
          }}
        >
          <span
            className="inline-block rounded-full"
            style={{
              width: 6, height: 6,
              background: dlcOnly ? "#8899E8" : "rgba(255,255,255,0.25)",
            }}
          />
          DLC ONLY
        </motion.button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        {buttons.map(b => {
          const isSelected = selected === b.key
          const disabled   = !b.available
          return (
            <motion.button
              key={b.key}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (disabled || isSelected) return
                onSelect(b.key)
              }}
              whileHover={disabled ? undefined : { y: -2, transition: { duration: 0.15 } }}
              className="flex items-center gap-3 rounded-[14px] px-4 py-3 text-left"
              style={{
                background: isSelected
                  ? "rgba(100,117,209,0.10)"
                  : "rgba(28,30,42,0.70)",
                border: isSelected
                  ? "1px solid rgba(100,117,209,0.45)"
                  : "1px solid rgba(255,255,255,0.05)",
                backdropFilter:       "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                opacity:              disabled ? 0.4 : 1,
                cursor:               disabled ? "not-allowed" : "pointer",
              }}
            >
              {typeof b.icon === "string" ? (
                <img
                  src={b.icon}
                  alt={b.label}
                  className="w-7 h-7 object-contain flex-shrink-0 rounded"
                />
              ) : (
                <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center">
                  {b.icon}
                </div>
              )}
              <span className="text-white text-sm font-semibold flex-1 truncate">
                {b.label}
              </span>
              {isSelected && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: "rgba(100,117,209,0.25)", color: "#8899E8" }}
                >
                  ACTIVE
                </span>
              )}
            </motion.button>
          )
        })}
      </div>
    </>
  )
}

// PC store search fallbacks — appended to the PC filter result for any major
// store that isn't already represented by a real deal. Guarantees the PC tab
// is never blank even when ITAD has no data for the game (Rockstar, etc.).
function buildPCFallbacks(title: string): PriceResult[] {
  const encoded = encodeURIComponent(title)
  return [
    {
      storeID:     "steam-search",
      storeName:   "Steam Store Search",
      storeIcon:   G("store.steampowered.com"),
      salePrice:   "N/A",
      normalPrice: "N/A",
      savings:     0,
      dealID:      "steam-search",
      dealLink:    `https://store.steampowered.com/search/?term=${encoded}`,
    },
    {
      storeID:     "kinguin-pc-search",
      storeName:   "Kinguin — PC Keys",
      storeIcon:   STORE_ICON_FALLBACKS["kinguin"],
      salePrice:   "N/A",
      normalPrice: "N/A",
      savings:     0,
      dealID:      "kinguin-pc-search",
      dealLink:    `https://www.kinguin.net/listing?phrase=${encoded}+pc`,
    },
    {
      storeID:     "g2a-pc",
      storeName:   "G2A — PC Keys",
      storeIcon:   STORE_ICON_FALLBACKS["g2a"],
      salePrice:   "N/A",
      normalPrice: "N/A",
      savings:     0,
      dealID:      "g2a-pc",
      dealLink:    `https://www.g2a.com/search?query=${encoded}+pc`,
    },
  ]
}

// Returns the synthetic deal entries for Xbox and Nintendo filters.
// Xbox: official Xbox Store search + G2A/Kinguin game-key search (Xbox supports CD-key activation).
// Switch: official Nintendo eShop search + G2A/Kinguin eShop gift cards.
function buildSearchDeals(platform: "xbox" | "switch", title: string): PriceResult[] {
  const encoded = encodeURIComponent(title)
  if (platform === "xbox") {
    return [
      {
        storeID:     "xbox-search",
        storeName:   "Xbox Store Search",
        storeIcon:   STORE_ICON_FALLBACKS["xbox"],
        salePrice:   "N/A",
        normalPrice: "N/A",
        savings:     0,
        dealID:      "xbox-search",
        dealLink:    `https://www.xbox.com/en-US/Search/Results?q=${encoded}`,
      },
      {
        // Xbox supports CD-key activation — G2A sells Xbox game keys at discount.
        storeID:     "g2a-xbox",
        storeName:   "G2A — Xbox Keys",
        storeIcon:   STORE_ICON_FALLBACKS["g2a"],
        salePrice:   "N/A",
        normalPrice: "N/A",
        savings:     0,
        dealID:      "g2a-xbox",
        dealLink:    `https://www.g2a.com/search?query=${encoded}+xbox`,
      },
      {
        storeID:     "kinguin-xbox",
        storeName:   "Kinguin — Xbox Keys",
        storeIcon:   STORE_ICON_FALLBACKS["kinguin"],
        salePrice:   "N/A",
        normalPrice: "N/A",
        savings:     0,
        dealID:      "kinguin-xbox",
        dealLink:    `https://www.kinguin.net/listing?phrase=${encoded}+xbox`,
      },
    ]
  }
  // Nintendo Switch — eShop gift cards (no transferable game keys on Switch)
  return [
    {
      storeID:     "nintendo-search",
      storeName:   "Nintendo eShop Search",
      storeIcon:   STORE_ICON_FALLBACKS["nintendo"],
      salePrice:   "N/A",
      normalPrice: "N/A",
      savings:     0,
      dealID:      "nintendo-search",
      dealLink:    `https://www.nintendo.com/us/search/?q=${encoded}`,
    },
    {
      storeID:     "g2a-switch",
      storeName:   "G2A — Nintendo Switch Keys",
      storeIcon:   STORE_ICON_FALLBACKS["g2a"],
      salePrice:   "N/A",
      normalPrice: "N/A",
      savings:     0,
      dealID:      "g2a-switch",
      dealLink:    `https://www.g2a.com/search?query=${encoded}+nintendo+switch`,
    },
    {
      storeID:     "kinguin-switch",
      storeName:   "Kinguin — Nintendo Gift Cards",
      storeIcon:   STORE_ICON_FALLBACKS["kinguin"],
      salePrice:   "N/A",
      normalPrice: "N/A",
      savings:     0,
      dealID:      "kinguin-switch",
      dealLink:    `https://www.kinguin.net/listing?phrase=nintendo+eshop+gift+card`,
    },
  ]
}

// PlayStation has no public price API and no "game key" market (PS uses account-based
// DRM — keys are not transferable). We show three purchase options instead:
//   1. PlayStation Store — direct official purchase (search link)
//   2. CDKeys          — sells PSN wallet vouchers / gift cards (add funds, then buy)
//   3. Eneba           — another major PSN gift-card reseller
// These are synthetic entries that always appear in the PS filter so the user is
// never left with an empty list.
function buildPSDeals(title: string): PriceResult[] {
  const encoded = encodeURIComponent(title)
  return [
    {
      storeID:     "ps-search",
      storeName:   "PlayStation Store",
      storeIcon:   STORE_ICON_FALLBACKS["playstation"],
      salePrice:   "N/A",
      normalPrice: "N/A",
      savings:     0,
      dealID:      "ps-search",
      dealLink:    `https://store.playstation.com/en-us/search/${encoded}`,
    },
    {
      // PSN wallet vouchers let users add funds and buy any PS game.
      // CDKeys sells PSN gift cards (USD) at slight discount.
      storeID:     "cdkeys-psn",
      storeName:   "CDKeys — PSN Gift Cards",
      storeIcon:   STORE_ICON_FALLBACKS["cdkeys"],
      salePrice:   "N/A",
      normalPrice: "N/A",
      savings:     0,
      dealID:      "cdkeys-psn",
      dealLink:    `https://www.cdkeys.com/catalogsearch/result/?q=psn+gift+card`,
    },
    {
      // Eneba is a leading European / global gift-card marketplace with PSN vouchers.
      storeID:     "eneba-psn",
      storeName:   "Eneba — PSN Gift Cards",
      storeIcon:   STORE_ICON_FALLBACKS["eneba"],
      salePrice:   "N/A",
      normalPrice: "N/A",
      savings:     0,
      dealID:      "eneba-psn",
      dealLink:    `https://www.eneba.com/store/psn-gift-cards`,
    },
    {
      // G2A is one of the largest key/gift-card marketplaces globally.
      storeID:     "g2a-ps-search",
      storeName:   "G2A — PlayStation",
      storeIcon:   STORE_ICON_FALLBACKS["g2a"],
      salePrice:   "N/A",
      normalPrice: "N/A",
      savings:     0,
      dealID:      "g2a-ps-search",
      dealLink:    `https://www.g2a.com/search?query=${encoded}+playstation`,
    },
    {
      // Kinguin is a major key marketplace with PSN wallet vouchers.
      storeID:     "kinguin-psn",
      storeName:   "Kinguin — PSN Gift Cards",
      storeIcon:   STORE_ICON_FALLBACKS["kinguin"],
      salePrice:   "N/A",
      normalPrice: "N/A",
      savings:     0,
      dealID:      "kinguin-psn",
      dealLink:    `https://www.kinguin.net/listing?phrase=psn+gift+card`,
    },
  ]
}

// Detect which platform a G2A variant belongs to based on its storeName.
// G2A storeNames look like "G2A — Steam Key Global", "G2A — Xbox Key EU", etc.
function g2aVariantPlatform(storeName: string): ConsolePlatform {
  const n = storeName.toLowerCase()
  if (n.includes("xbox") || n.includes("microsoft")) return "xbox"
  if (n.includes("nintendo") || n.includes("switch") || n.includes("eshop")) return "switch"
  if (n.includes("playstation") || n.includes("psn") || n.includes("ps4") || n.includes("ps5") || n.includes("ps store")) return "ps"
  // Steam, GOG, EA App, Uplay, Battle.net, Origin, Windows, PC → PC
  return "pc"
}

// Stores that are clearly console-only and should be excluded from PC filter
const CONSOLE_STORE_NAMES = new Set([
  "nintendo eshop", "nintendo eshop search",
  "playstation store",
  "xbox store search",
  // Synthetic PS-filter entries
  "cdkeys — psn gift cards",
  "eneba — psn gift cards",
  "g2a — psn gift cards",
  "kinguin — psn gift cards",
  // Synthetic Xbox key entries
  "g2a — xbox keys",
  "kinguin — xbox keys",
  // Synthetic Nintendo gift-card entries
  "kinguin — nintendo gift cards",
  // Real G2A backend platform keys (excluded from PC tab)
  "g2a — nintendo switch keys",
  "g2a — playstation keys",
])

// Returns true for rows that belong in the "GIFT CARDS & WALLET TOP-UPS" sub-section
// (PS wallet vouchers only — Xbox/Nintendo G2A/Kinguin are key marketplaces, not gift cards).
function isGiftCardRow(d: PriceResult): boolean {
  return (
    d.storeID === "cdkeys-psn"   ||
    d.storeID === "eneba-psn"    ||
    d.storeID === "kinguin-psn"  ||
    d.storeID === "g2a-ps"
  )
}

// Filter the full deals list down to only the entries relevant to the selected
// platform. For PC: show all PC-store deals (everything except console-only stores).
// For console platforms: show that platform's store(s) + a synthetic search link
// so the user always has a destination, even when ITAD has no data for that platform.
function filterDealsByPlatform(
  deals: PriceResult[],
  platform: ConsolePlatform,
  title: string,
): PriceResult[] {
  const isG2A = (d: PriceResult) => d.storeID.startsWith("g2a-")

  if (platform === "pc") {
    // PC = everything that isn't a console-only store.
    // Microsoft Store stays — it sells PC versions (Xbox PC app).
    // G2A: keep only PC-platform variants (Steam Key, GOG Key, etc.)
    //       — route Xbox/Nintendo/PS G2A variants to their respective tabs.
    const pcDeals = deals.filter(d => {
      const n = d.storeName.toLowerCase()
      if (CONSOLE_STORE_NAMES.has(n)) return false
      if (n === "nintendo eshop" || n === "playstation store") return false
      if (isG2A(d)) return g2aVariantPlatform(d.storeName) === "pc"
      return true
    })

    // Append search-link fallbacks for any major PC store not already present.
    // This mirrors how Xbox/Nintendo/PS tabs always have at least one fallback
    // link, so the PC tab is never blank (e.g. for Rockstar/DRM-only games).
    const existingNames = new Set(pcDeals.map(d => d.storeName.toLowerCase()))
    const hasSteam   = existingNames.has("steam")
    // GOG and Epic are NOT in buildPCFallbacks — they only appear when ITAD returns real
    // deals for them. Synthetic GOG/Epic search links led to dead-end pages for most games.
    const fallbacks  = buildPCFallbacks(title).filter(f => {
      if (f.storeID === "steam-search")      return !hasSteam
      if (f.storeID === "kinguin-pc-search") return true   // always useful as extra option
      return true
    })

    return [...pcDeals, ...fallbacks]
  }

  let storeDeals: PriceResult[] = []

  if (platform === "xbox") {
    storeDeals = deals.filter(d => {
      const n = d.storeName.toLowerCase()
      if (n === "microsoft store" || n.includes("xbox")) return true
      // G2A Xbox variants from backend (e.g. "G2A — Xbox Key Global")
      if (isG2A(d)) return g2aVariantPlatform(d.storeName) === "xbox"
      return false
    })
    // Build synthetic fallbacks; omit the G2A ones if real G2A Xbox data arrived
    const hasRealG2AXbox = storeDeals.some(d => isG2A(d))
    const synth = buildSearchDeals("xbox", title)
    const filtered = hasRealG2AXbox
      ? synth.filter(s => !s.storeID.startsWith("g2a-") && !s.storeID.startsWith("kinguin-"))
      : synth
    return [...storeDeals, ...filtered]

  } else if (platform === "switch") {
    storeDeals = deals.filter(d => {
      const n = d.storeName.toLowerCase()
      if (n === "nintendo eshop" || n.includes("nintendo")) return true
      // G2A Nintendo variants from backend (e.g. "G2A — Nintendo Switch Key")
      if (isG2A(d)) return g2aVariantPlatform(d.storeName) === "switch"
      return false
    })
    const hasRealG2ASwitch = storeDeals.some(d => isG2A(d))
    const synth = buildSearchDeals("switch", title)
    const filtered = hasRealG2ASwitch
      ? synth.filter(s => !s.storeID.startsWith("g2a-") && !s.storeID.startsWith("kinguin-"))
      : synth
    return [...storeDeals, ...filtered]

  } else if (platform === "ps") {
    // PlayStation has no game-key market — only PSN wallet vouchers.
    // Include any G2A PSN-gift-card variants that came from the backend.
    storeDeals = deals.filter(d => {
      const n = d.storeName.toLowerCase()
      if (n === "playstation store" || n.includes("playstation")) return true
      if (isG2A(d)) return g2aVariantPlatform(d.storeName) === "ps"
      return false
    })
    const psStoreAlreadyPresent = storeDeals.some(d =>
      d.storeName.toLowerCase() === "playstation store"
    )
    const hasRealG2APS = storeDeals.some(d => isG2A(d))
    const synthetic = buildPSDeals(title)
    // If real G2A PS data exists, drop the synthetic G2A/Kinguin search entries
    const filteredSynthetic = hasRealG2APS
      ? synthetic.filter(s => !s.storeID.startsWith("g2a-") && !s.storeID.startsWith("kinguin-"))
      : synthetic
    return [
      ...storeDeals,
      ...(psStoreAlreadyPresent ? filteredSynthetic.slice(1) : filteredSynthetic),
    ]
  }

  return storeDeals
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GameDetailPage() {
  const { id }           = useParams<{ id: string }>()
  const router           = useRouter()
  const { user, logout } = useAuth()
  const isLoggedIn       = !!user

  const [game,          setGame]          = useState<Game | null>(null)
  const [deals,         setDeals]         = useState<PriceResult[]>([])
  const [giveaways,     setGiveaways]     = useState<GiveawayItem[]>([])
  const [events,        setEvents]        = useState<GameEvent[]>([])
  const [loadingGame,   setLoadingGame]   = useState(true)
  const [loadingDeals,  setLoadingDeals]  = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [tab,           setTab]           = useState<"Events" | "Discounts">("Events")
  const [inWishlist,    setInWishlist]    = useState(false)
  const [wishlistBusy,  setWishlistBusy]  = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<ConsolePlatform>("pc")
  // DLC-only mode — when true, the deals list shows DLC discounts instead of
  // base-game deals. Lazy-fetched the first time it's enabled and cached.
  const [dlcOnly,         setDlcOnly]         = useState(false)
  const [dlcDeals,        setDlcDeals]        = useState<PriceResult[] | null>(null)
  const [loadingDlcDeals, setLoadingDlcDeals] = useState(false)

  // When the game loads, if the current platform tab isn't supported (e.g. PC
  // default selected but game is PS-only), switch to the first available one.
  useEffect(() => {
    if (!game) return
    const avail = detectAvailablePlatforms(game.platforms)
    if (!avail[selectedPlatform]) {
      const fallback: ConsolePlatform =
        avail.pc ? "pc" : avail.xbox ? "xbox" : avail.switch ? "switch" : "ps"
      setSelectedPlatform(fallback)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game])

  // Lazy-fetch DLC deals the first time the user toggles DLC-only mode on.
  // Cached for the lifetime of the page mount — toggling off then on again is free.
  useEffect(() => {
    if (!dlcOnly) return
    if (dlcDeals !== null) return         // already fetched (may be empty array)
    if (!game?.steamAppId) return         // no Steam AppID → can't list DLCs
    setLoadingDlcDeals(true)
    getGameDlcDeals(game.steamAppId)
      .then(d => setDlcDeals(d))
      .catch(() => setDlcDeals([]))
      .finally(() => setLoadingDlcDeals(false))
  }, [dlcOnly, dlcDeals, game?.steamAppId])

  // When a different game loads, drop the cached DLC deals so the toggle re-fetches.
  useEffect(() => {
    setDlcDeals(null)
    setDlcOnly(false)
  }, [id])

  // Stable router reference for useEffect deps
  const routerPush = useCallback((path: string) => router.push(path), [router])

  // Load game, then deals + giveaways + events in parallel
  useEffect(() => {
    if (!id) return
    setLoadingGame(true)
    setLoadingDeals(true)
    setLoadingEvents(true)

    getGameById(id)
      .then(g => {
        setGame(g)

        // Deals + giveaways in parallel (both use game title / steamAppId)
        Promise.all([
          getGameDeals(g.name, g.steamAppId).catch(() => []),
          getGameGiveaways(g.name).catch(() => []),
        ]).then(([d, gv]) => {
          setDeals(d as PriceResult[])
          setGiveaways(gv as GiveawayItem[])
        }).finally(() => setLoadingDeals(false))

        // Events — only possible when we have a Steam AppID
        if (g.steamAppId) {
          getGameEvents(g.steamAppId)
            .catch(() => [])
            .then(ev => setEvents(ev as GameEvent[]))
            .finally(() => setLoadingEvents(false))
        } else {
          setEvents([])
          setLoadingEvents(false)
        }
      })
      .catch(() => routerPush("/"))
      .finally(() => setLoadingGame(false))
  }, [id, routerPush])

  // Check whether this game is already in the user's wishlist
  useEffect(() => {
    if (!isLoggedIn || !id) return
    getWishlist()
      .then((list: { gameId: string }[]) => setInWishlist(list.some(w => w.gameId === id)))
      .catch(() => console.warn("[Wishlist] Failed to load wishlist"))
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
    } catch (err) {
      console.warn("[Wishlist] Toggle failed:", err)
    } finally {
      setWishlistBusy(false)
    }
  }

  const handleNav = (label: string, href: string) => {
    if (!isLoggedIn && AUTH_NAV.has(label)) { router.push("/login"); return }
    router.push(href)
  }

  // Console platforms — if the game is on PS/Xbox/Switch we render the console
  // buttons section even when there are no PC deals, so the tab is never blank.
  const hasConsolePlatforms = (game?.platforms ?? []).some(p => {
    const lp = p.toLowerCase()
    return lp.includes("xbox") || lp.includes("playstation") || lp.includes("nintendo")
  })

  // Apply the console-filter chip. When a platform is selected we restrict the
  // deals list to only that platform's stores + a synthetic Store Search entry.
  // In DLC-only mode the source switches to the DLC deals list and the platform
  // filter is bypassed (DLCs are PC-store priced; no console editions exist).
  const visibleDeals  = dlcOnly
    ? (dlcDeals ?? [])
    : filterDealsByPlatform(deals, selectedPlatform, game?.name ?? "")
  // Split gift-card/wallet-voucher rows into a separate sub-section rendered below main deals.
  const mainDeals     = visibleDeals.filter(d => !isGiftCardRow(d))
  const giftCardDeals = visibleDeals.filter(d => isGiftCardRow(d))

  // Cheapest deal for the "Buy" button — based on the currently visible list,
  // so the floating Buy button respects an active filter.
  const cheapestDeal = visibleDeals.length > 0
    ? visibleDeals.reduce((a, b) => {
        const pa = parseFloat(a.salePrice)
        const pb = parseFloat(b.salePrice)
        if (isNaN(pa)) return b
        if (isNaN(pb)) return a
        return pa <= pb ? a : b
      })
    : null

  // No content to show in discounts tab
  const discountsEmpty = !loadingDeals && deals.length === 0 && giveaways.length === 0 && !hasConsolePlatforms

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
            {/* Back button */}
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

            {/* Cover card */}
            <div className="relative rounded-[10px] overflow-hidden mb-4 flex-shrink-0" style={{ height: 280 }}>
              {game.cover ? (
                <img src={game.cover} alt={game.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full" style={{ background: "linear-gradient(135deg,#1c2a3a,#2a1c3a)" }} />
              )}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(18,19,26,0.92) 0%, rgba(18,19,26,0.3) 50%, transparent 100%)" }}
              />

              {/* Top-right: external link + favorite */}
              <div className="absolute top-3 right-3 flex gap-2">
                {cheapestDeal && (
                  <a
                    href={cheapestDeal.dealLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Best price on ${cheapestDeal.storeName}`}
                    className="flex items-center justify-center"
                    style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.5)" }}
                  >
                    <ExternalLink size={14} className="text-[#B3BADE]" />
                  </a>
                )}
                <motion.button
                  onClick={handleToggleWishlist}
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
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

              {/* Bottom: title + badges */}
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

            {/* Platform pills */}
            {game.platforms.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {[...new Set(game.platforms.map(shortPlatform))].slice(0, 5).map(p => (
                  <span
                    key={p}
                    className="text-[11px] font-semibold px-3 py-1.5"
                    style={{ background: "#2A2D32", color: "#B3BADE", borderRadius: 6 }}
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

            {/* Friend circles — placeholder */}
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

            {/* Buy button — links to the cheapest store page for THIS game */}
            {cheapestDeal && (
              <motion.a
                href={cheapestDeal.dealLink}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.01 }}
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
                {game.genres.map(genre => (
                  <span
                    key={genre}
                    className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                    style={{
                      background: "rgba(100,117,209,0.15)",
                      color:      "#B3BADE",
                      border:     "1px solid rgba(100,117,209,0.25)",
                    }}
                  >
                    {genre}
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

                {/* ── EVENTS TAB ── Steam news / in-game events */}
                {tab === "Events" ? (
                  <motion.div
                    key="events"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {loadingEvents ? (
                      <EventsSkeleton />
                    ) : events.length === 0 ? (
                      <EmptyEvents hasSteam={!!game.steamAppId} />
                    ) : (
                      <>
                        <p className="text-[9px] font-bold tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.25)" }}>
                          LATEST FROM STEAM
                        </p>
                        <div className="flex flex-col gap-3">
                          {events.map(ev => (
                            <SteamEventCard key={ev.id} event={ev} />
                          ))}
                        </div>
                      </>
                    )}
                  </motion.div>

                ) : (

                  /* ── DISCOUNTS TAB ── Store prices + free giveaways */
                  <motion.div
                    key="discounts"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {loadingDeals ? (
                      <DiscountsSkeleton />
                    ) : discountsEmpty ? (
                      <EmptyDiscounts />
                    ) : (
                      <>
                        {/* Console platform filter chips — Xbox / Nintendo / PlayStation */}
                        <ConsoleButtons
                          platforms={game.platforms}
                          selected={selectedPlatform}
                          onSelect={setSelectedPlatform}
                          dlcOnly={dlcOnly}
                          onToggleDlc={() => setDlcOnly(v => !v)}
                          dlcAvailable={!!game.steamAppId}
                        />
                        {/* Loading indicator while DLC deals are being fetched on first toggle */}
                        {dlcOnly && loadingDlcDeals && (
                          <p
                            className="text-[11px] mb-3"
                            style={{ color: "rgba(255,255,255,0.45)" }}
                          >
                            Loading DLC discounts…
                          </p>
                        )}
                        {/* DLC mode but the fetch returned zero results */}
                        {dlcOnly && !loadingDlcDeals && visibleDeals.length === 0 && (
                          <p
                            className="text-[11px] mb-3"
                            style={{ color: "rgba(255,255,255,0.45)" }}
                          >
                            No DLC discounts found for this game.
                          </p>
                        )}

                        {/* Store deals — sorted cheapest first, best deal highlighted.
                            When a console filter is active, `visibleDeals` shows only
                            that platform's stores + a synthetic Store Search link.
                            In DLC mode, every row carries a `dlcName` shown below the store. */}
                        {visibleDeals.length > 0 && (
                          <>
                            <p
                              className="text-[9px] font-bold tracking-widest mb-3"
                              style={{ color: "rgba(255,255,255,0.25)" }}
                            >
                              {dlcOnly
                                ? `DLC DISCOUNTS · ${mainDeals.length} DEAL${mainDeals.length === 1 ? "" : "S"}`
                                : selectedPlatform === "ps"
                                ? `WHERE TO BUY ON PLAYSTATION · ${mainDeals.length} OPTION${mainDeals.length > 1 ? "S" : ""}`
                                : selectedPlatform === "pc"
                                ? `WHERE TO BUY · ${mainDeals.length} STORE${mainDeals.length > 1 ? "S" : ""}`
                                : `STORES FOR THIS CONSOLE · ${mainDeals.length} STORE${mainDeals.length > 1 ? "S" : ""}`}
                            </p>
                            <div className="flex flex-col gap-2 mb-3">
                              {mainDeals.map((deal, i) => (
                                <DiscountRow
                                  key={`${deal.storeID}-${deal.dealID}`}
                                  deal={deal}
                                  // Only highlight as "Best Deal" when the row has a real price
                                  isCheapest={i === 0 && deal.salePrice !== "N/A" && deal.salePrice !== "0.00"}
                                />
                              ))}
                            </div>
                            {giftCardDeals.length > 0 && (
                              <>
                                <p
                                  className="text-[9px] font-bold tracking-widest mt-4 mb-3"
                                  style={{ color: "rgba(255,255,255,0.18)" }}
                                >
                                  GIFT CARDS & WALLET TOP-UPS · {giftCardDeals.length} OPTION{giftCardDeals.length > 1 ? "S" : ""}
                                </p>
                                <div className="flex flex-col gap-2 mb-5">
                                  {giftCardDeals.map(deal => (
                                    <DiscountRow
                                      key={`${deal.storeID}-${deal.dealID}`}
                                      deal={deal}
                                      isCheapest={false}
                                    />
                                  ))}
                                </div>
                              </>
                            )}
                          </>
                        )}

                        {/* 🎁 Giveaways — shown below store deals */}
                        {giveaways.length > 0 && (
                          <>
                            <p
                              className="text-[9px] font-bold tracking-widest mb-3"
                              style={{ color: "#5BDE8A" }}
                            >
                              🎁 FREE GIVEAWAYS
                            </p>
                            <div className="flex flex-col gap-2">
                              {giveaways.map(gv => (
                                <GiveawayRow key={gv.id} giveaway={gv} />
                              ))}
                            </div>
                          </>
                        )}
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

// ─── Skeletons & Empty States ─────────────────────────────────────────────────

function EventsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-36 rounded-[16px] bg-[#1c1e2a] animate-pulse" />
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

function EmptyEvents({ hasSteam }: { hasSteam: boolean }) {
  return (
    <div
      className="rounded-[16px] p-8 text-center"
      style={{ background: "rgba(28,30,42,0.60)", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      <Zap size={28} className="mx-auto mb-3 opacity-30 text-white" />
      <p className="text-white font-semibold text-sm mb-1">No events right now</p>
      <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.35)" }}>
        {hasSteam
          ? "This game has no recent news or events on Steam."
          : "In-game events are only available for Steam titles."}
      </p>
    </div>
  )
}

function EmptyDiscounts() {
  return (
    <div
      className="rounded-[16px] p-8 text-center"
      style={{ background: "rgba(28,30,42,0.60)", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      <Tag size={28} className="mx-auto mb-3 opacity-30 text-white" />
      <p className="text-white font-semibold text-sm mb-1">No discounts found</p>
      <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.35)" }}>
        This game may be console-exclusive or not currently on sale.
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
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-36 rounded-[16px] bg-[#1c1e2a] animate-pulse" />)}
          </div>
        </div>
      </div>
    </main>
  )
}
