"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Home, BellRing, Search as SearchIcon, Users, User, ArrowLeft,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useUnreadCount } from "@/hooks/useUnreadCount"
import { BackgroundGradientAnimation } from "@/components/ui/BackgroundGradientAnimation"
import NotificationDot from "@/components/ui/NotificationDot"

const glassStyle = {
  background: "rgba(30, 38, 51, 0.70)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
} as const

const NAV = [
  { icon: Home,        label: "Home",          href: "/"              },
  { icon: BellRing,    label: "Notifications", href: "/notifications" },
  { icon: SearchIcon,  label: "Search",        href: "/search"        },
  { icon: Users,       label: "Friends",       href: "/friends"       },
  { icon: User,        label: "Profile",       href: "/profile"       },
] as const

interface Props {
  title: string
  children: React.ReactNode
  backHref?: string
}

export default function ProfileSubLayout({ title, children, backHref = "/profile" }: Props) {
  const router = useRouter()
  const { logout } = useAuth()
  const { counts } = useUnreadCount()

  return (
    <main className="relative w-screen h-screen overflow-hidden" style={{ background: "#1E2532" }}>
      <BackgroundGradientAnimation />
      <img
        src="/icons/auth-bg-top.svg"
        aria-hidden
        className="absolute inset-0 w-full h-full pointer-events-none object-cover"
        style={{ zIndex: 2 }}
      />

      <div className="relative flex h-full" style={{ zIndex: 3 }}>
        {/* Sidebar */}
        <aside
          className="flex flex-col flex-shrink-0 h-full"
          style={{ width: 240, ...glassStyle, borderRight: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-3 px-5 pt-6 pb-5">
            <img src="/icons/logo.svg" alt="" style={{ width: 30, height: 30 }} />
            <span className="text-white font-bold text-[17px] tracking-wide">DisLow</span>
          </div>

          <div className="px-3 mb-1">
            <p className="text-[9px] font-bold tracking-[0.12em] px-3 mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>MENU</p>
            {NAV.map(({ icon: Icon, label, href }) => (
              <motion.button
                key={label}
                onClick={() => router.push(href)}
                whileTap={{ scale: 0.97 }}
                className="w-full flex items-center gap-3 px-3 py-2.5 mb-0.5 text-[16px] font-medium relative"
                style={{
                  borderRadius: 10,
                  color: label === "Profile" ? "#48BCF9" : "rgba(255,255,255,0.45)",
                  background: label === "Profile" ? "rgba(52,82,229,0.13)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {label === "Profile" && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2"
                    style={{ width: 3, height: 20, background: "#48BCF9", borderRadius: "0 4px 4px 0" }}
                  />
                )}
                <Icon size={15} />
                <span className="flex-1 text-left">{label}</span>
                {label === "Notifications" && (
                  <NotificationDot events={counts.events} discounts={counts.discounts} />
                )}
              </motion.button>
            ))}
          </div>

          <div className="flex-1" />

          <button
            onClick={logout}
            className="flex items-center gap-3 px-8 py-5 text-[16px] font-medium"
            style={{
              color: "rgba(255,255,255,0.35)",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              width: "100%",
              borderTopWidth: 1,
              borderTopStyle: "solid",
              borderTopColor: "rgba(255,255,255,0.05)",
            }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF6B4A]" />
            log out
          </button>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <div className="max-w-lg mx-auto px-8 py-10">
            {/* Back button */}
            <button
              onClick={() => router.push(backHref)}
              className="flex items-center gap-2 mb-6 text-[13px] transition-colors hover:text-white"
              style={{
                background: "rgba(28,30,42,0.60)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10,
                padding: "6px 12px",
                color: "#b3bade",
                cursor: "pointer",
              }}
            >
              <ArrowLeft size={14} />
              Back
            </button>

            <h1 className="text-white text-2xl font-bold mb-6">{title}</h1>

            {children}
          </div>
        </div>
      </div>
    </main>
  )
}
