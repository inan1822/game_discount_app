"use client"

/**
 * AppSidebar — shared desktop sidebar used by ALL main app pages.
 * Mounted ONCE inside (main)/layout.tsx so it persists across route changes,
 * letting the limelight indicator visibly slide between items on navigation.
 *
 * Limelight pattern adapted from EaseMize "limelight-nav" (21st.dev).
 * Original is horizontal — bar on top, cone hangs down (narrow at top, wide
 * at bottom). Here it's rotated 90° for a vertical sidebar: bar on the left
 * edge, cone fans right (narrow at the bar, wide as it spreads).
 */

import { useLayoutEffect, useRef, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  Home, BellRing, Search as SearchIcon,
  Users, User, LogIn, Receipt, Shield, Star,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useUnreadCount } from "@/hooks/useUnreadCount"
import NotificationDot from "@/components/ui/NotificationDot"

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV = [
  { icon: Home,        label: "Home",          href: "/"               },
  { icon: BellRing,    label: "Notifications", href: "/notifications"  },
  { icon: Star,        label: "Favorites",     href: "/wishlist"       },
  { icon: SearchIcon,  label: "Search",        href: "/search"         },
  { icon: Receipt,     label: "Purchases",     href: "/account/orders" },
  { icon: Users,       label: "Friends",       href: "/friends"        },
  { icon: User,        label: "Profile",       href: "/profile"        },
] as const

const AUTH_ITEMS = new Set(["Notifications", "Favorites", "Friends", "Profile", "Purchases"])

// ── NavItem (stateless — parent owns the active indicator) ────────────────────

function NavItem({
  icon: Icon, label, active, locked, dot, onClick, itemRef,
}: {
  icon:     React.ElementType
  label:    string
  active:   boolean
  locked:   boolean
  dot?:     React.ReactNode
  onClick:  () => void
  itemRef?: (el: HTMLButtonElement | null) => void
}) {
  // Hover effects only fire on idle (non-active, non-locked) items. On the
  // active item the limelight already provides the visual emphasis, and on
  // locked items we want them to feel inert.
  const interactive = !active && !locked
  return (
    <motion.button
      ref={itemRef}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      whileHover={interactive ? { x: 4 } : undefined}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className={`group w-full flex items-center gap-3 px-6 py-2.5 mb-0.5 text-[18px] ${active ? "font-bold" : "font-medium"} relative`}
      style={{
        borderRadius: 10,
        color:      active ? "#49BCF9" : locked ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.45)",
        background: "transparent",
        border:     "none",
        cursor:     locked ? "not-allowed" : "pointer",
        transition: "color 0.25s, opacity 0.25s, background 0.25s",
        opacity:    active ? 1 : locked ? 0.45 : 0.65,
      }}
    >
      {/* Hover background — a faint blue wash sliding in from the left.
          Skipped on active (limelight already provides emphasis) + locked. */}
      {interactive && (
        <span
          aria-hidden
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            borderRadius: 10,
            background: "linear-gradient(to right, rgba(73,188,249,0.12) 0%, rgba(73,188,249,0.03) 15%, transparent 30%)",
            zIndex: 0,
          }}
        />
      )}

      {/* Hover mini-accent on the left edge — a dim preview of the
          limelight bar that appears when the item is hovered. */}
      {interactive && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 w-[3px] h-0 opacity-0 group-hover:h-[18px]
           group-hover:opacity-70 transition-all duration-300 -translate-y-1/2 pointer-events-none"

          style={{
            background: "linear-gradient(to bottom, transparent, #49BCF9, transparent)",
            filter: "blur(2px)",
            borderRadius: "0 2px 2px 0",
            zIndex: 1,
          }}
        />
      )}

      <Icon
        size={15}
        style={{ position: "relative", zIndex: 2, transition: "color 0.25s, filter 0.25s" }}
        className={interactive ? "group-hover:text-[#9FDFFF] group-hover:drop-shadow-[0_0_4px_rgba(73,188,249,0.5)]" : ""}
      />
      <span
        className={`flex-1 text-left ${interactive ? "group-hover:text-[#D4ECFF]" : ""}`}
        style={{ position: "relative", zIndex: 2, transition: "color 0.25s" }}
      >
        {label}
      </span>
      {locked && (
        <span
          className="text-[8px] px-1 py-0.5 rounded"
          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.2)", position: "relative", zIndex: 2 }}
        >
          Login
        </span>
      )}
      {dot && <span style={{ position: "relative", zIndex: 2 }}>{dot}</span>}
    </motion.button>
  )
}

// ── AppSidebar ────────────────────────────────────────────────────────────────

export default function AppSidebar() {
  const router   = useRouter()
  const pathname = usePathname()
  const { user, isLoading, logout } = useAuth()
  const { counts } = useUnreadCount()

  const isLoggedIn = !isLoading && !!user

  /** Match active item by pathname prefix */
  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname === href || pathname.startsWith(href + "/")
  }

  function handleClick(label: string, href: string) {
    if (!isLoggedIn && AUTH_ITEMS.has(label)) {
      router.push("/login")
      return
    }
    // Skip navigation if we're already on this route — prevents the
    // "Home button refreshes the sidebar" feedback the user reported.
    if (isActive(href)) return
    router.push(href)
  }

  // ── Limelight (shared sliding indicator) ────────────────────────────────────
  const navItemRefs                         = useRef<(HTMLButtonElement | null)[]>([])
  const limelightRef                        = useRef<HTMLDivElement>(null)
  const [limelightReady, setLimelightReady] = useState(false)

  useLayoutEffect(() => {
    const activeIdx = NAV.findIndex(n => isActive(n.href))
    if (activeIdx < 0) return
    const itemEl    = navItemRefs.current[activeIdx]
    const limelight = limelightRef.current
    if (!itemEl || !limelight) return

    const barH   = 36
    const newTop = itemEl.offsetTop + itemEl.offsetHeight / 2 - barH / 2
    limelight.style.top     = `${newTop}px`
    limelight.style.opacity = "1"

    if (!limelightReady) {
      // Defer one frame so the first position lands with NO transition
      requestAnimationFrame(() => setLimelightReady(true))
    }
  }, [pathname, limelightReady])


 
  return (
    <aside
      className="flex flex-col flex-shrink-0 h-full"
      style={{
        width: 240,
        // Gradient-only background, no solid color, with blur underneath.
        background:
          "linear-gradient(180deg, rgba(52,82,229,0.10) 0%, rgba(30,38,51,0.55) 40%, rgba(174,59,214,0.08) 100%)",
        backdropFilter:       "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRight:          "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <img src="/icons/logo.svg" alt="DisLow" style={{ width: 30, height: 30 }} />
        <span className="text-white font-bold text-[17px] tracking-wide">DisLow</span>
      </div>

      {/* Nav */}
      <div className="mb-1">
        <p className="text-[9px] font-bold tracking-[0.12em] px-6 mb-2"
          style={{ color: "rgba(255,255,255,0.25)" }}>
          MENU
        </p>

        {/* Limelight container — position:relative so the sliding indicator's
            offsetTop math is correct (offsetParent = this div). */}
        <div style={{ position: "relative" }}>

          {/* The single shared limelight indicator.
              The BAR has no solid fill — only a vertical gradient. The CONE
              fans rightward and gets wider with distance (narrow at the bar,
              wide as it spreads), then is blurred 3px for softness.       */}
          <div
            ref={limelightRef}
            aria-hidden
            style={{
              position:   "absolute",
              left:       0,
              top:        -999,
              width:      3,
              height:     36,
              opacity:    0,
              background: "linear-gradient(to bottom, transparent 0%, #6DCBFF 25%, #49BCF9 50%, #49BCF9 75%, transparent 100%)",
              boxShadow:  "0 0 14px 2px rgba(73,188,249,0.55)",
              borderRadius: "0 4px 4px 0",
              transition: limelightReady
                ? "top 0.42s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s"
                : "opacity 0.25s",
              zIndex: 1,
              pointerEvents: "none",
            }}
          >
            {/* Rightward fan cone — NARROW at the bar, WIDE as it spreads.
                Mirror of the reference's polygon(5% 100%, 25% 0, 75% 0, 95% 100%)
                rotated 90°: at left edge y = 40%–60% (narrow), at right edge
                y = 0%–100% (full width). Blurred 3px for a soft spotlight. */}
            <div aria-hidden style={{
              position:   "absolute",
              top:        "50%",
              left:       3,
              transform:  "translateY(-50%)",
              width:      180,
              height:     180,
              clipPath:   "polygon(0% 40%, 0% 60%, 100% 70%, 100% 30%)",
              background: "linear-gradient(to right, rgba(73,188,249,0.35) 0%, rgba(73,188,249,0.08) 55%, transparent 100%)",
              filter:     "blur(4px)",
              pointerEvents: "none",
            }} />
          </div>

          {NAV.map(({ icon: Icon, label, href }, i) => (
            <NavItem
              key={label}
              icon={Icon}
              label={label}
              active={isActive(href)}
              locked={!isLoggedIn && AUTH_ITEMS.has(label)}
              dot={
                label === "Notifications" && isLoggedIn
                  ? <NotificationDot events={counts.events} discounts={counts.discounts} />
                  : undefined
              }
              onClick={() => handleClick(label, href)}
              itemRef={el => { navItemRefs.current[i] = el }}
            />
          ))}
        </div>
      </div>

      <div className="flex-1" />

      {/* Admin mode switch — only shown for users with role: "admin" */}
      {isLoggedIn && user?.role === "admin" && (
        <div className="px-3 pb-2">
          <motion.button
            onClick={() => router.push("/admin")}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center gap-3 px-6 py-2.5 text-[18px] font-medium"
            style={{
              borderRadius: 10,
              color: "#6475D1",
              background: "rgba(100,117,209,0.13)",
              border: "1px solid rgba(100,117,209,0.25)",
              cursor: "pointer",
            }}
            title="Switch to Admin panel"
          >
            <Shield size={15} />
            <span className="flex-1 text-left">Switch to Admin</span>
          </motion.button>
        </div>
      )}
      {/* Logout / Login */}
      {isLoggedIn ? (
        <motion.button
          onClick={logout}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-3 px-6 py-5 text-[18px] font-medium w-full"
          style={{
            color: "rgba(255,255,255,0.35)",
            background: "transparent",
            cursor: "pointer",
            // Use longhand-only — mixing `border` shorthand with `borderTop*`
            // longhand makes React warn about conflicting style updates.
            borderWidth: 0,
            borderTopWidth: 1,
            borderTopStyle: "solid",
            borderTopColor: "rgba(255,255,255,0.05)",
          }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF6B4A]" />
          log out
        </motion.button>
      ) : (
        <motion.button
          onClick={() => router.push("/login")}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-3 px-6 py-5 text-[18px] font-semibold w-full"
          style={{
            color: "#48BCF9",
            background: "transparent",
            cursor: "pointer",
            // Longhand-only — see logout button above.
            borderWidth: 0,
            borderTopWidth: 1,
            borderTopStyle: "solid",
            borderTopColor: "rgba(255,255,255,0.05)",
          }}
        >
          <LogIn size={15} /> Log in
        </motion.button>
      )}
    </aside>
  )
}
