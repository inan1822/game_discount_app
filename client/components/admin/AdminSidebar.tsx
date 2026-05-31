"use client"
import { useLayoutEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  LayoutDashboard, ShoppingCart, Package, Users, BarChart2,
  Megaphone, Settings, Menu, X, UserCircle,
} from "lucide-react"
import api from "@/lib/api/axios"

// ── Nav sections (grouped like the user sidebar's MENU / SOCIAL) ───────────────

interface NavLink { href: string; label: string; icon: React.ElementType }
interface NavSection { label: string; items: NavLink[] }

const SECTIONS: NavSection[] = [
  {
    label: "MANAGE",
    items: [
      { href: "/admin",          label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/orders",   label: "Orders",    icon: ShoppingCart },
      { href: "/admin/products", label: "Products",  icon: Package },
      { href: "/admin/users",    label: "Users",     icon: Users },
    ],
  },
  {
    label: "GROWTH",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: BarChart2 },
      { href: "/admin/marketing", label: "Marketing", icon: Megaphone },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
]

const ALL_ITEMS: NavLink[] = SECTIONS.flatMap(s => s.items)

// ── NavItem (stateless — parent owns the sliding limelight indicator) ──────────

function NavItem({
  icon: Icon, label, active, onClick, itemRef,
}: {
  icon:     React.ElementType
  label:    string
  active:   boolean
  onClick:  () => void
  itemRef?: (el: HTMLButtonElement | null) => void
}) {
  const interactive = !active
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
        color:      active ? "#6475D1" : "rgba(255,255,255,0.45)",
        background: "transparent",
        border:     "none",
        cursor:     "pointer",
        transition: "color 0.25s, opacity 0.25s, background 0.25s",
        opacity:    active ? 1 : 0.65,
      }}
    >
      {/* Hover background */}
      {interactive && (
        <span
          aria-hidden
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            borderRadius: 10,
            background: "linear-gradient(to right, rgba(100,117,209,0.12) 0%, rgba(100,117,209,0.03) 15%, transparent 30%)",
            zIndex: 0,
          }}
        />
      )}

      {/* Hover mini-accent on left edge */}
      {interactive && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 w-[3px] h-0 opacity-0 group-hover:h-[18px]
           group-hover:opacity-70 transition-all duration-300 -translate-y-1/2 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent, #6475D1, transparent)",
            filter: "blur(2px)",
            borderRadius: "0 2px 2px 0",
            zIndex: 1,
          }}
        />
      )}

      <Icon
        size={15}
        style={{ position: "relative", zIndex: 2, transition: "color 0.25s, filter 0.25s" }}
        className={interactive ? "group-hover:text-[#9FAFFF] group-hover:drop-shadow-[0_0_4px_rgba(100,117,209,0.5)]" : ""}
      />
      <span
        className={`flex-1 text-left ${interactive ? "group-hover:text-[#D4DCFF]" : ""}`}
        style={{ position: "relative", zIndex: 2, transition: "color 0.25s" }}
      >
        {label}
      </span>
    </motion.button>
  )
}

// ── AdminSidebar ───────────────────────────────────────────────────────────────

export function AdminSidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [open, setOpen] = useState(false)

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin"
    return pathname === href || pathname.startsWith(href + "/")
  }

  function go(href: string) {
    setOpen(false)
    if (isActive(href)) return
    router.push(href)
  }

  async function handleSignOut() {
    try { await api.post("/auth/logout") } catch { /* best-effort */ }
    router.push("/login")
    router.refresh()
  }

  // ── Limelight (shared sliding indicator) ────────────────────────────────────
  const navItemRefs                         = useRef<(HTMLButtonElement | null)[]>([])
  const limelightRef                        = useRef<HTMLDivElement>(null)
  const [limelightReady, setLimelightReady] = useState(false)

  useLayoutEffect(() => {
    const activeIdx = ALL_ITEMS.findIndex(n => isActive(n.href))
    if (activeIdx < 0) return
    const itemEl    = navItemRefs.current[activeIdx]
    const limelight = limelightRef.current
    if (!itemEl || !limelight) return

    const barH   = 36
    const newTop = itemEl.offsetTop + itemEl.offsetHeight / 2 - barH / 2
    limelight.style.top     = `${newTop}px`
    limelight.style.opacity = "1"

    if (!limelightReady) {
      requestAnimationFrame(() => setLimelightReady(true))
    }
  }, [pathname, limelightReady])

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="md:hidden fixed top-3 left-3 z-50 p-2"
        style={{
          background: "rgba(28,30,42,0.60)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          borderRadius: 10,
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
        aria-label="Toggle navigation"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Backdrop (mobile only, when open) */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-30"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 flex flex-col flex-shrink-0 h-full transform transition-transform ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        style={{
          width:                240,
          background:           "rgba(30,38,51,0.40)",
          backdropFilter:       "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderRight:          "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-5">
          <img src="/icons/logo.svg" alt="DisLow" style={{ width: 30, height: 30 }} />
          <div className="flex flex-col">
            <span className="text-white font-bold text-[17px] tracking-wide" style={{ lineHeight: 1 }}>DisLow</span>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.25)", marginTop: 3 }}>
              ADMIN PANEL
            </span>
          </div>
        </div>

        {/* Limelight container */}
        <div style={{ position: "relative", flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>

          {/* The single shared limelight indicator */}
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
              background: "linear-gradient(to bottom, transparent 0%, #8A96E8 25%, #6475D1 50%, #6475D1 75%, transparent 100%)",
              boxShadow:  "0 0 14px 2px rgba(100,117,209,0.55)",
              borderRadius: "0 4px 4px 0",
              transition: limelightReady
                ? "top 0.42s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s"
                : "opacity 0.25s",
              zIndex: 1,
              pointerEvents: "none",
            }}
          >
            {/* Rightward fan cone */}
            <div aria-hidden style={{
              position:   "absolute",
              top:        "50%",
              left:       3,
              transform:  "translateY(-50%)",
              width:      180,
              height:     180,
              clipPath:   "polygon(0% 40%, 0% 60%, 100% 70%, 100% 30%)",
              background: "linear-gradient(to right, rgba(100,117,209,0.35) 0%, rgba(100,117,209,0.08) 55%, transparent 100%)",
              filter:     "blur(4px)",
              pointerEvents: "none",
            }} />
          </div>

          {/* Sections */}
          {SECTIONS.map((section, si) => {
            const offset = SECTIONS.slice(0, si).reduce((n, s) => n + s.items.length, 0)
            return (
              <div key={section.label} className={si === 0 ? "mb-1" : "mt-2 mb-1"}>
                {si > 0 && (
                  <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "6px 16px" }} />
                )}
                <p className="text-[9px] font-bold tracking-[0.12em] px-6 mb-2"
                  style={{ color: "rgba(255,255,255,0.25)" }}>
                  {section.label}
                </p>
                {section.items.map(({ icon, label, href }, i) => (
                  <NavItem
                    key={label}
                    icon={icon}
                    label={label}
                    active={isActive(href)}
                    onClick={() => go(href)}
                    itemRef={el => { navItemRefs.current[offset + i] = el }}
                  />
                ))}
              </div>
            )
          })}
        </div>

        {/* Switch to User view */}
        <div className="px-3 pb-2">
          <motion.button
            onClick={() => { setOpen(false); router.push("/") }}
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
            title="Switch to User view"
          >
            <UserCircle size={15} />
            <span className="flex-1 text-left">Switch to User View</span>
          </motion.button>
        </div>

        {/* Sign out — pinned bottom, red */}
        <motion.button
          onClick={handleSignOut}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-3 px-6 py-5 text-[18px] font-medium w-full"
          style={{
            color: "#ef4444",
            background: "transparent",
            cursor: "pointer",
            borderWidth: 0,
            borderTopWidth: 1,
            borderTopStyle: "solid",
            borderTopColor: "rgba(255,255,255,0.05)",
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{ width: 18, height: 18, borderRadius: "50%", background: "#3d1515", flexShrink: 0 }}
          >
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
          </div>
          log out
        </motion.button>
      </aside>
    </>
  )
}
