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
import { LogIn, Receipt, User, Shield, MessageCircle } from "@/shared/icons"
import { useAuth } from "@/features/auth/state/AuthContext"
import { useUnreadCount } from "@/features/chat/utils/useUnreadCount"
import { useChat } from "@/features/chat/state/ChatContext"
import NotificationDot from "@/shared/components/NotificationDot"

// ── Project SVG icon components (currentColor — respond to CSS color) ─────────

function HomeIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 17 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.94961 14.9807C5.26129 14.9807 6.32461 13.9173 6.32461 12.6057V11.2336C6.32461 10.1843 7.17527 9.33359 8.22461 9.33359C9.27395 9.33359 10.1246 10.1843 10.1246 11.2336V12.6057C10.1246 13.9173 11.1879 14.9807 12.4996 14.9807C13.8113 14.9807 14.8746 13.9173 14.8746 12.6057V8.23763C14.8746 7.80332 15.2267 7.45124 15.661 7.45124C16.3835 7.45124 16.7236 6.55873 16.1844 6.07789L10.2211 0.76084C9.08341 -0.253606 7.36581 -0.253605 6.22808 0.760841L0.264859 6.07789C-0.274414 6.55873 0.0657049 7.45124 0.788214 7.45124C1.22253 7.45124 1.57461 7.80332 1.57461 8.23763V12.6057C1.57461 13.9173 2.63793 14.9807 3.94961 14.9807Z" />
    </svg>
  )
}

function BellIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 17 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.86474 1.91906C4.24761 1.57 4.30138 0.959337 3.92808 0.600064C3.64164 0.324399 3.19553 0.291829 2.89393 0.550821C1.37244 1.85741 0.322416 3.64809 0.00893017 5.67187C-0.0658686 6.15475 0.328228 6.5641 0.816868 6.5641C1.27068 6.5641 1.63994 6.20866 1.72051 5.76205C1.99146 4.26011 2.76133 2.92506 3.86474 1.91906ZM15.1193 5.76345C15.1999 6.20925 15.5686 6.5641 16.0216 6.5641C16.5105 6.5641 16.9043 6.1537 16.8281 5.67077C16.5095 3.64905 15.4612 1.86003 13.9474 0.553951C13.6455 0.293408 13.1976 0.326422 12.9112 0.60399C12.5415 0.962324 12.5945 1.56829 12.9741 1.91616C14.0726 2.9228 14.8471 4.25949 15.1193 5.76345ZM13.5353 6.97436C13.5353 4.64643 12.3411 2.66888 10.2354 1.94192C9.92683 1.83539 9.69876 1.55723 9.69876 1.23077C9.69876 0.549744 9.12755 0 8.41992 0C7.7123 0 7.14109 0.549744 7.14109 1.23077C7.14109 1.55718 6.91293 1.83526 6.60423 1.94129C4.492 2.66682 3.30458 4.6383 3.30458 6.97436V10.226C3.30458 10.7697 3.08321 11.29 2.69145 11.667L1.77592 12.5481C1.66317 12.6566 1.59946 12.8064 1.59946 12.9629C1.59946 13.2808 1.85717 13.5385 2.17507 13.5385H14.6648C14.9827 13.5385 15.2404 13.2808 15.2404 12.9629C15.2404 12.8064 15.1767 12.6566 15.0639 12.5481L14.1484 11.667C13.7566 11.29 13.5353 10.7697 13.5353 10.226V6.97436ZM8.41992 16C8.53928 16 8.65011 15.9918 8.76095 15.9672C9.31511 15.8523 9.76697 15.4913 9.98863 14.999C10.1329 14.6659 9.82224 14.359 9.45923 14.359H8.41945C7.47592 14.359 6.72524 15.2947 7.54221 15.7667C7.7984 15.9147 8.09833 16 8.41992 16Z" />
    </svg>
  )
}

function FavoritesIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 50 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M25 38.5768L40.45 48L36.35 30.24L50 18.2905L32.025 16.7495L25 0L17.975 16.7495L0 18.2905L13.65 30.24L9.55 48L25 38.5768Z" />
    </svg>
  )
}

function SearchIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.6707 10.299C11.5156 10.1436 11.3975 9.95525 11.3252 9.74795C11.1534 9.25554 11.2848 8.72525 11.5446 8.27308C11.9222 7.61602 11.8925 7.0641 11.8925 5.94626C11.8925 2.66209 9.23042 0 5.94626 0C2.66209 0 0 2.66209 0 5.94626C0 9.23042 2.66209 11.8925 5.94626 11.8925C7.07726 11.8925 7.68177 11.907 8.37369 11.5077C8.81397 11.2536 9.33803 11.1407 9.809 11.332C9.97657 11.4 10.1288 11.5009 10.2569 11.6287L13.9547 15.3192C14.3316 15.6953 14.942 15.695 15.3185 15.3185C15.695 14.942 15.6953 14.3316 15.3192 13.9547L11.6707 10.299ZM5.94626 10.0629C3.66838 10.0629 1.82962 8.22413 1.82962 5.94626C1.82962 3.66838 3.66838 1.82962 5.94626 1.82962C8.22413 1.82962 10.0629 3.66838 10.0629 5.94626C10.0629 8.22413 8.22413 10.0629 5.94626 10.0629Z" />
    </svg>
  )
}

function FriendsIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 19 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M10.0455 11.9074C10.0455 11.0766 10.0648 10.2459 10.039 9.41644C10.0197 8.76722 9.84319 8.1448 9.56232 7.54917C9.24151 6.86706 8.76868 6.29823 8.16185 5.82563C8.1013 5.77813 8.02528 5.72453 8.06265 5.63927C8.09486 5.56375 8.18375 5.57471 8.25333 5.57471C9.12298 5.57349 9.99393 5.57471 10.8636 5.57471C11.0195 5.57471 11.1303 5.64658 11.2359 5.74889C11.7989 6.2958 12.4779 6.62833 13.2625 6.82443C13.6761 6.92797 14.0781 6.92553 14.4891 6.93649C14.712 6.94258 14.9361 6.94624 15.141 6.83296C15.1861 6.80738 15.2492 6.80373 15.3033 6.80494C15.4025 6.80616 15.5262 6.76231 15.5894 6.86463C15.6422 6.95111 15.543 7.0181 15.4992 7.08266C15.1487 7.61495 14.9954 8.19717 15.0882 8.81351C15.1835 9.44933 15.4811 9.9938 16.0197 10.4189C16.5402 10.8294 17.1161 11.045 17.7963 11.0048C17.8917 10.9987 17.9883 11.0036 18.0837 11.0048C18.3993 11.0097 18.4431 11.0486 18.4444 11.3495C18.447 12.369 18.447 13.3873 18.4444 14.4068C18.4431 14.8392 18.2254 15.039 17.768 15.0402C17.4485 15.0414 17.129 15.0402 16.8095 15.0402C16.4036 15.039 16.383 15.0183 16.3817 14.6248C16.3817 13.8782 16.3817 13.1303 16.3804 12.3836C16.3804 12.224 16.3753 12.0657 16.2619 11.9317C16.1382 11.7856 16.0055 11.6552 15.78 11.71C15.57 11.7612 15.3536 11.9829 15.3394 12.1705C15.3291 12.3057 15.333 12.4421 15.333 12.5773C15.333 13.2643 15.3343 13.9512 15.3317 14.6382C15.3304 14.9403 15.2685 15.0036 14.9555 15.0049C13.4622 15.0085 11.969 15.0085 10.4771 15.0049C10.1202 15.0049 10.0493 14.9293 10.0493 14.5822C10.0467 13.6918 10.0493 12.8014 10.0493 11.9098L10.0455 11.9074Z" />
      <path d="M8.9021 11.91C8.9021 12.8308 8.90338 13.7516 8.9021 14.6737C8.9021 15.0062 8.86731 15.0391 8.51816 15.0391C6.98499 15.0391 5.45182 15.0391 3.91865 15.0391C3.57207 15.0391 3.54244 15.0099 3.54115 14.6701C3.53986 13.9222 3.53729 13.1755 3.54115 12.4276C3.54115 12.2474 3.50121 12.0829 3.40201 11.9319C3.30409 11.7833 3.17525 11.6603 2.97426 11.7029C2.74493 11.7516 2.60836 11.9124 2.54781 12.1195C2.52075 12.212 2.5272 12.3143 2.5272 12.4118C2.52591 13.1743 2.5272 13.9368 2.52462 14.6993C2.52462 14.9989 2.4821 15.0355 2.1613 15.0379C1.79411 15.0403 1.42692 15.0428 1.05973 15.0379C0.682237 15.0318 0.467078 14.8296 0.465789 14.4703C0.461924 13.4203 0.461924 12.3716 0.465789 11.3216C0.465789 11.0512 0.516036 11.0147 0.805922 11.0025C1.19244 10.9867 1.57766 11.0342 1.9616 10.8904C2.64444 10.6359 3.20875 10.2668 3.54888 9.63585C4.01012 8.782 3.93153 7.95007 3.43937 7.13154C3.38783 7.0475 3.24869 6.95614 3.32986 6.85626C3.42133 6.7442 3.60042 6.771 3.70993 6.82216C4.06166 6.98172 4.42884 6.92691 4.79217 6.93666C5.44537 6.95614 6.04447 6.76491 6.61265 6.48354C7.07131 6.25698 7.16407 6.26429 7.54672 6.59195C7.86495 6.86479 8.08526 7.20828 8.31202 7.54203C8.72559 8.15105 8.924 8.82098 8.90596 9.55425C8.88663 10.3387 8.9021 11.1243 8.9021 11.91V11.91Z" />
      <path d="M4.67715 0C6.45898 0.00609025 7.82595 1.35691 7.84012 2.97935C7.85429 4.57865 6.41517 6.00986 4.6385 5.97332C2.85667 5.93678 1.50387 4.66513 1.5 2.9891C1.49743 1.32158 2.81802 0.023143 4.67715 0Z" />
      <path d="M14.2495 3.29287e-06C16.0558 0.0255824 17.424 1.3496 17.415 2.98057C17.406 4.62738 16.0622 5.97089 14.2095 5.97454C12.5437 5.97698 11.0272 4.64443 11.0672 2.90018C11.1045 1.34717 12.4844 -0.00243281 14.2495 3.29287e-06Z" />
      <path d="M18.91 8.70539C18.91 8.92464 18.9139 9.14267 18.91 9.36192C18.8997 9.75779 18.6356 9.99043 18.2169 10.0111C17.7298 10.0355 17.2686 9.9746 16.8357 9.74926C16.7365 9.6981 16.6399 9.64573 16.5639 9.56899C15.6762 8.67738 16.0279 7.50439 17.1423 7.04519C17.8084 6.77113 18.5673 7.07199 18.8314 7.67614C18.8817 7.79063 18.9087 7.90513 18.91 8.02694C18.91 8.25349 18.91 8.48005 18.91 8.70661V8.70539Z" />
      <path d="M0.972726 10.0071C0.65965 10.0095 0.386514 10.0436 0.179085 9.80855C0.0708609 9.68553 0 9.56372 0 9.40416C0.00128838 8.95957 -0.00128838 8.51498 0.00257676 8.06917C0.00901865 7.25186 0.948247 6.72445 1.729 7.02652C2.38092 7.27866 2.88597 7.90961 2.82155 8.58563C2.77259 9.09843 2.40412 9.75008 1.6968 9.89138C1.4417 9.94253 1.19819 10.0388 0.974015 10.0071H0.972726Z" />
    </svg>
  )
}

// ── Nav items ─────────────────────────────────────────────────────────────────

const MENU_NAV = [
  { icon: HomeIcon,      label: "Home",          href: "/"               },
  { icon: BellIcon,      label: "Notifications", href: "/notifications"  },
  { icon: FavoritesIcon, label: "Favourites",    href: "/favourites"     },
  { icon: SearchIcon,    label: "Search",        href: "/search"         },
  { icon: Receipt,       label: "Purchases",     href: "/account/orders" },
] as const

const SOCIAL_NAV = [
  { icon: FriendsIcon, label: "Friends", href: "/friends" },
] as const

const PROFILE_NAV = [
  { icon: User, label: "Profile", href: "/profile" },
] as const

const ALL_NAV = [...MENU_NAV, ...SOCIAL_NAV, ...PROFILE_NAV]

const AUTH_ITEMS = new Set(["Notifications", "Favourites", "Friends", "Profile", "Purchases"])

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
        color:      active ? "#6475D1" : locked ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.45)",
        background: "transparent",
        border:     "none",
        cursor:     locked ? "not-allowed" : "pointer",
        transition: "color 0.25s, opacity 0.25s, background 0.25s",
        opacity:    active ? 1 : locked ? 0.45 : 0.65,
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
  const { totalUnread: chatUnread, toggleWindow, windowOpen } = useChat()

  const isLoggedIn = !isLoading && !!user

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname === href || pathname.startsWith(href + "/")
  }

  function handleClick(label: string, href: string) {
    if (!isLoggedIn && AUTH_ITEMS.has(label)) {
      router.push("/login")
      return
    }
    if (isActive(href)) return
    router.push(href)
  }

  // ── Limelight (shared sliding indicator) ────────────────────────────────────
  const navItemRefs                         = useRef<(HTMLButtonElement | null)[]>([])
  const limelightRef                        = useRef<HTMLDivElement>(null)
  const [limelightReady, setLimelightReady] = useState(false)

  useLayoutEffect(() => {
    const activeIdx = ALL_NAV.findIndex(n => isActive(n.href))
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
    <aside
      className="flex flex-col flex-shrink-0 h-full"
      style={{
        width: 240,
        background:           "rgba(30,38,51,0.40)",
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

        {/* MENU section */}
        <div className="mb-1">
          <p className="text-[9px] font-bold tracking-[0.12em] px-6 mb-2"
            style={{ color: "rgba(255,255,255,0.25)" }}>
            MENU
          </p>
          {MENU_NAV.map(({ icon: Icon, label, href }, i) => (
            <NavItem
              key={label}
              icon={Icon}
              label={label}
              active={isActive(href)}
              locked={!isLoggedIn && AUTH_ITEMS.has(label)}
              dot={
                label === "Notifications" && isLoggedIn
                  ? <NotificationDot events={counts.events} discounts={counts.discounts} messages={chatUnread} size={6}/>
                  : undefined
              }
              onClick={() => handleClick(label, href)}
              itemRef={el => { navItemRefs.current[i] = el }}
            />
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "6px 16px" }} />

        {/* SOCIAL section */}
        <div className="mt-2 mb-1">
          <p className="text-[9px] font-bold tracking-[0.12em] px-6 mb-2"
            style={{ color: "rgba(255,255,255,0.25)" }}>
            SOCIAL
          </p>
          {SOCIAL_NAV.map(({ icon: Icon, label, href }, i) => (
            <NavItem
              key={label}
              icon={Icon}
              label={label}
              active={isActive(href)}
              locked={!isLoggedIn && AUTH_ITEMS.has(label)}
              onClick={() => handleClick(label, href)}
              itemRef={el => { navItemRefs.current[MENU_NAV.length + i] = el }}
            />
          ))}

          {/* Chat — toggles the floating chat window */}
          <NavItem
            icon={MessageCircle}
            label="Chat"
            active={windowOpen}
            locked={!isLoggedIn}
            onClick={() => isLoggedIn ? toggleWindow() : router.push("/login")}
            dot={chatUnread > 0 ? (
              <span style={{
                background: "#6475D1", color: "#fff",
                minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999,
                fontSize: 10, fontWeight: 700,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                {chatUnread > 99 ? "99+" : chatUnread}
              </span>
            ) : undefined}
          />

          {/* Profile — below Chat */}
          {PROFILE_NAV.map(({ icon: Icon, label, href }, i) => (
            <NavItem
              key={label}
              icon={Icon}
              label={label}
              active={isActive(href)}
              locked={!isLoggedIn && AUTH_ITEMS.has(label)}
              onClick={() => handleClick(label, href)}
              itemRef={el => { navItemRefs.current[MENU_NAV.length + SOCIAL_NAV.length + i] = el }}
            />
          ))}
        </div>

      </div>

      {/* Admin mode switch — only shown for users with role: "admin" */}
      {isLoggedIn && user?.role === "admin" && (
        <div className="px-3 pb-2">
          <motion.button
            onClick={() => { window.location.href = process.env.NEXT_PUBLIC_CRM_URL ?? "http://localhost:3001" }}
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
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#3d1515",
              flexShrink: 0,
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
          </div>
          log out
        </motion.button>
      ) : (
        <motion.button
          onClick={() => router.push("/login")}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-3 px-6 py-5 text-[18px] font-semibold w-full"
          style={{
            color: "#6475D1",
            background: "transparent",
            cursor: "pointer",
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
