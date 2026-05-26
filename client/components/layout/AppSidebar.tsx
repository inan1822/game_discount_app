"use client"

/**
 * AppSidebar — shared desktop sidebar used by ALL main app pages.
 * Drop-in replacement for the copy-pasted <aside> that lived in each page.
 * Owns: nav items, active detection, notification dot, logout/login.
 */

import { useRef, useState } from "react"
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

// ── NavItem ───────────────────────────────────────────────────────────────────

function NavItem({
  icon: Icon, label, active, locked, dot, onClick,
}: {
  icon:    React.ElementType
  label:   string
  active:  boolean
  locked:  boolean
  dot?:    React.ReactNode
  onClick: () => void
}) {
  const ref                   = useRef<HTMLButtonElement>(null)
  const [pos,     setPos]     = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState(false)

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      onMouseMove={e => {
        const r = ref.current!.getBoundingClientRect()
        setPos({ x: e.clientX - r.left, y: e.clientY - r.top })
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
        transition: "color 0.2s",
      }}
    >
      {/* Active left bar */}
      {active && (
        <motion.div
          layoutId="app-sidebar-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2"
          style={{ width: 3, height: 20, background: "#48BCF9", borderRadius: "0 4px 4px 0" }}
        />
      )}

      {/* Cursor glow */}
      <div style={{
        position:     "absolute",
        left:         pos.x,
        top:          pos.y,
        width:        120,
        height:       120,
        borderRadius: "50%",
        transform:    "translate(-50%, -50%)",
        background:   "radial-gradient(circle, #48BCF9 10%, transparent 70%)",
        opacity:      hovered && !active ? 0.13 : 0,
        transition:   "opacity 0.2s",
        pointerEvents:"none",
      }} />

      <Icon size={15} />
      <span className="flex-1 text-left">{label}</span>
      {dot}
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
    router.push(href)
  }

  return (
    <motion.aside
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="flex flex-col flex-shrink-0 h-full"
      style={{
        width: 240,
        background:           "rgba(30, 38, 51, 0.70)",
        backdropFilter:       "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderRight:          "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <img src="/icons/logo.svg" alt="DisLow" style={{ width: 30, height: 30 }} />
        <span className="text-white font-bold text-[17px] tracking-wide">DisLow</span>
      </div>

      {/* Nav */}
      <div className="px-3 mb-1">
        <p className="text-[9px] font-bold tracking-[0.12em] px-3 mb-2"
          style={{ color: "rgba(255,255,255,0.25)" }}>
          MENU
        </p>
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
          />
        ))}
      </div>

      <div className="flex-1" />

      {/* Admin mode switch — only shown for users with role: "admin" */}
      {isLoggedIn && user?.role === "admin" && (
        <div className="px-3 pb-2">
          <motion.button
            onClick={() => router.push("/admin")}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-[14px] font-medium"
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
          className="flex items-center gap-3 px-8 py-5 text-[16px] font-medium w-full"
          style={{
            color: "rgba(255,255,255,0.35)",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
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
          className="flex items-center gap-3 px-8 py-5 text-[16px] font-semibold w-full"
          style={{
            color: "#48BCF9",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            borderTopWidth: 1,
            borderTopStyle: "solid",
            borderTopColor: "rgba(255,255,255,0.05)",
          }}
        >
          <LogIn size={15} /> Log in
        </motion.button>
      )}
    </motion.aside>
  )
}
