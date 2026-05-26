"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Heart, Bell, Search } from "lucide-react"

const tabs = [
  { href: "/",              icon: Home,   label: "Home"          },
  { href: "/wishlist",      icon: Heart,  label: "Favourites"    },
  { href: "/notifications", icon: Bell,   label: "Notifications" },
  { href: "/search",        icon: Search, label: "Search"        },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] z-50">
      <div className="glass border-t border-[rgba(188,188,201,0.15)] px-2 py-3">
        <div className="flex justify-around items-center">
          {tabs.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1 px-3 py-1 transition-all"
              >
                <Icon
                  size={22}
                  className={isActive ? "text-[#AE3BD6]" : "text-[#9fa0a1]"}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                <span className={`text-[10px] ${isActive ? "text-[#AE3BD6] font-semibold" : "text-[#9fa0a1]"}`}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
