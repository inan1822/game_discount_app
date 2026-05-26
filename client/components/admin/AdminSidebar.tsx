"use client"
import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, ShoppingCart, Package, Users, BarChart2, Megaphone, Settings, LogOut, Menu, X, UserCircle } from "lucide-react"
import api from "@/lib/api/axios"

const NAV = [
  { href: "/admin",            label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders",     label: "Orders",    icon: ShoppingCart },
  { href: "/admin/products",   label: "Products",  icon: Package },
  { href: "/admin/users",      label: "Users",     icon: Users },
  { href: "/admin/analytics",  label: "Analytics",  icon: BarChart2 },
  { href: "/admin/marketing",  label: "Marketing",  icon: Megaphone },
  { href: "/admin/settings",   label: "Settings",   icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleSignOut() {
    try { await api.post("/auth/logout") } catch { /* best-effort */ }
    router.push("/login")
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="md:hidden fixed top-3 left-3 z-50 p-2"
        style={{
          background: "rgba(28,30,42,0.60)",
          backdropFilter: "blur(6px)",
          borderRadius: 10,
          color: "#fff",
          border: "1px solid rgba(188,188,201,0.20)",
        }}
        aria-label="Toggle navigation"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-60 flex flex-col transform transition-transform ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        style={{
          background: "rgba(30,38,51,0.40)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderRight: "1px solid rgba(188,188,201,0.15)",
        }}
      >
        <div className="p-5" style={{ borderBottom: "1px solid rgba(188,188,201,0.15)" }}>
          <div className="flex items-center gap-3">
            <img src="/icons/logo.svg" alt="" style={{ width: 32, height: 32 }} />
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>DisLow</p>
              <p style={{ fontSize: 11, color: "#9fa0a1" }}>Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/admin" && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 transition-colors"
                style={{
                  borderRadius: 10,
                  fontSize: 14,
                  background: active ? "rgba(100,117,209,0.15)" : "transparent",
                  color: active ? "#6475D1" : "#b3bade",
                }}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User-view mode switch — admin layout already gates non-admins out */}
        <div className="px-3 pb-2">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2.5"
            style={{
              borderRadius: 10,
              fontSize: 14,
              color: "#6475D1",
              background: "rgba(100,117,209,0.13)",
              border: "1px solid rgba(100,117,209,0.25)",
            }}
            title="Switch to User view"
          >
            <UserCircle className="w-4 h-4" />
            <span className="flex-1 text-left">Switch to User View</span>
          </Link>
        </div>

        <div className="p-3" style={{ borderTop: "1px solid rgba(188,188,201,0.15)" }}>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 transition-colors"
            style={{
              borderRadius: 10,
              fontSize: 14,
              color: "#ef4444",
              background: "transparent",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.10)" }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
