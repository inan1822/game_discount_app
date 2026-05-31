"use client"

import { useEffect, useRef, useState, useCallback, useLayoutEffect } from "react"
import { useRouter } from "next/navigation"
import { BellRing, CheckCheck } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useChat } from "@/context/ChatContext"
import { useUnreadCount } from "@/hooks/useUnreadCount"
import {
  getNotifications, markRead, markAllRead, deleteNotification,
} from "@/lib/api/notifications"
import type { Notification } from "@/types/notification"
import { GlowCard } from "@/components/ui/spotlight-card"
import { SectionHeading } from "@/components/ui/SectionHeading"
import Avatar from "@/components/friends/Avatar"

type Tab = "all" | "events" | "discounts" | "messages"

// Semantic neon palette — glow follows the active tab and rows use their type color.
// `hue` is the HSL hue that matches `hex` — used to lock the GlowCard spotlight
// to a single color (otherwise GlowCard renders a gradient that drifts off-color).
const NEON = {
  all:       { hex: "#48BCF9", rgb: "72,188,249",  glow: "blue"   as const, hue: 200 },
  events:    { hex: "#A521D3", rgb: "168,85,247",  glow: "purple" as const, hue: 287 },
  discounts: { hex: "#44D62C", rgb: "68,214,44",   glow: "green"  as const, hue: 110 },
  messages:  { hex: "#6475D1", rgb: "100,117,209", glow: "blue"   as const, hue: 230 },
}

// Where the spotlight pins on the tab bar (xp ∈ [0,1] from left to right)
const TAB_PIN: Record<Tab, number> = {
  all:       0.125, // center of the first quarter
  events:    0.375,
  discounts: 0.625,
  messages:  0.875, // center of the last quarter
}

const cardStyle = {
  background:           "rgba(28,30,42,0.70)",
  border:               "1px solid rgba(188,188,201,0.15)",
  borderRadius:         12,
  backdropFilter:       "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
} as const


// Animates ONLY the spotlight color (--base / --spread).
// Position (--x, --y, --xp, --yp) is handled entirely by GlowCard's own
// `pinned` logic — which is proven to work (same approach as the game detail page).
// Separating concerns this way means the hook never has to fight React over --x/--y,
// and avoids the glowEl-null initialization race that broke the previous version.
//
// `containerRef` is read inside useLayoutEffect where the DOM is committed and
// querySelector is guaranteed to find the [data-glow] element — no intermediate
// state needed.
function useHueAnimation(
  containerRef: React.RefObject<HTMLDivElement | null>,
  targetHue: number,
  duration = 450,
) {
  const hueRef      = useRef(targetHue)
  const rafRef      = useRef<number | null>(null)
  const initialized = useRef(false)

  useLayoutEffect(() => {
    const el = containerRef.current?.querySelector<HTMLElement>("[data-glow]")
    if (!el) return

    const write = (hue: number) => {
      el.style.setProperty("--base",   hue.toFixed(2))
      el.style.setProperty("--spread", "0")
    }

    if (!initialized.current) {
      hueRef.current = targetHue
      write(targetHue)
      initialized.current = true
      return
    }

    const start = hueRef.current
    // Synchronously write current hue before this frame paints.
    // Overwrites React's --base reset (from glowColor in getInlineStyles) so
    // the animation never flashes to the wrong color for even one frame.
    write(start)
    const startAt = performance.now()
    const ease    = (t: number) => 1 - Math.pow(1 - t, 3)

    const tick = (now: number) => {
      const t = Math.min(1, (now - startAt) / duration)
      const hue = start + (targetHue - start) * ease(t)
      hueRef.current = hue
      write(hue)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current) }
  }, [targetHue]) // containerRef is a stable ref object — safe to omit
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const m  = Math.floor(ms / 60_000)
  if (m < 1)   return "just now"
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function NotificationsPage() {
  const router       = useRouter()
  const { user, isLoading } = useAuth()
  const { counts, refresh: refreshCounts } = useUnreadCount()
  const { myId, conversations, totalUnread: chatUnread, openConversation, refreshConversations } = useChat()

  const [tab, setTab] = useState<Tab>("all")
  const [hoveredTab, setHoveredTab] = useState<Tab | null>(null)
  // Which tab drives the glow + colors: hovered one takes precedence, otherwise active
  const focusTab = hoveredTab ?? tab

  // wrapRef wraps the GlowCard. useHueAnimation reads [data-glow] from it directly.
  const wrapRef = useRef<HTMLDivElement>(null)
  useHueAnimation(wrapRef, NEON[focusTab].hue)

  const [items, setItems]     = useState<Notification[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const loaderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login")
  }, [isLoading, user, router])

  const load = useCallback(async (reset = false) => {
    if (!user) return
    if (reset) setLoading(true)
    else setLoadingMore(true)

    try {
      const before = reset ? undefined : items[items.length - 1]?.createdAt
      const page   = await getNotifications(20, before)
      setItems(prev => reset ? page.items : [...prev, ...page.items])
      setHasMore(page.hasMore)
    } finally {
      if (reset) setLoading(false)
      else setLoadingMore(false)
    }
  }, [user, items])

  // Messages tab shows the chat conversation list — not the notifications feed.
  useEffect(() => {
    if (tab === "messages") { setLoading(false); refreshConversations(); return }
    load(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, tab])

  // Infinite scroll observer
  useEffect(() => {
    if (!loaderRef.current || !hasMore) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingMore) load()
    }, { threshold: 0.1 })
    obs.observe(loaderRef.current)
    return () => obs.disconnect()
  }, [hasMore, loadingMore, load])

  const handleMarkRead = async (id: string) => {
    await markRead(id)
    setItems(prev => prev.map(n => n._id === id ? { ...n, read: true } : n))
    refreshCounts()
  }

  const handleDelete = async (id: string) => {
    await deleteNotification(id)
    setItems(prev => prev.filter(n => n._id !== id))
    refreshCounts()
  }

  const handleMarkAllRead = async () => {
    await markAllRead()
    setItems(prev => prev.map(n => ({ ...n, read: true })))
    refreshCounts()
  }

  const visibleItems = items.filter(n => {
    if (tab === "events")    return n.type === "event"
    if (tab === "discounts") return n.type === "discount"
    return true
  })

  if (isLoading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-white/40 text-sm">Loading…</div>
      </div>
    )
  }

  return (
    // Shell (sidebar + background) provided by (app)/layout.tsx
    // Width follows THE WIDTH RULE: min(calc(100% - 192px), 1600px), centered.
    <div
      style={{
        width:         "min(calc(100% - 192px), 1600px)",
        marginInline:  "auto",
        paddingBlock:  40,
      }}
    >
      <SectionHeading
        title="Notifications"
        right={tab !== "messages" && counts.total > 0 ? (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 text-[14px] font-semibold transition-colors"
            style={{
              color:        NEON.all.hex,
              background:   `rgba(${NEON.all.rgb},0.10)`,
              border:       "none",
              borderRadius: 999,
              padding:      "6px 16px",
              cursor:       "pointer",
              marginBottom: 2,
            }}
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        ) : undefined}
      />

      {/* Tab bar — pinned handles spotlight position (same approach as game detail page).
          useHueAnimation owns --base/--spread for smooth color transitions.
          No manual mode — GlowCard's own cursor tracking + applyPinned work freely. */}
      <div ref={wrapRef} className="mb-5">
      <GlowCard
        customSize
        pinned={{ xp: TAB_PIN[focusTab], yp: 0.95 }}
        className="!rounded-[12px] !p-1 !aspect-auto !backdrop-blur-none !shadow-none flex gap-1"
        style={{
          width:                "100%",
          background:           "rgba(28, 30, 42, 0.40)",
          backdropFilter:       "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          ["--bg-spot-opacity" as any]:      "0.18",
          ["--border-spot-opacity" as any]:  "0.9",
          ["--border-light-opacity" as any]: "0.5",
          ["--size" as any]:                 "350",
          ["--saturation" as any]:           "90",
          ["--lightness" as any]:            "60",
        } as React.CSSProperties}
      >
        {(["all", "events", "discounts", "messages"] as const).map(t => {
          const active  = tab === t
          const hovered = hoveredTab === t
          // Show this tab's neon color when active OR when hovered
          const lit     = active || hovered
          const badge   = t === "messages" && chatUnread > 0 ? chatUnread : 0
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              onMouseEnter={() => setHoveredTab(t)}
              onMouseLeave={() => setHoveredTab(null)}
              className="flex-1 px-8 py-[6px] text-[18px] relative z-10 capitalize transition-colors after:absolute after:inset-[-60px] after:content-[''] inline-flex items-center justify-center gap-2"
              style={{
                borderRadius: 9,
                background:   "transparent",
                color:        lit    ? NEON[t].hex : "rgba(255,255,255,0.4)",
                fontWeight:   active ? 700 : hovered ? 600 : 500,
                border:       "1px solid transparent",
                boxShadow:    "none",
                transition:   "color 0.45s cubic-bezier(.2,.7,.3,1), font-weight 0.25s",
                cursor:       "pointer",
              }}
            >
              {t}
              {badge > 0 && (
                <span style={{
                  background: NEON.messages.hex, color: "#fff",
                  minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999,
                  fontSize: 11, fontWeight: 700, lineHeight: "20px",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}>
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </button>
          )
        })}
      </GlowCard>
      </div>

      {/* Messages tab → chat conversation list (most recent first) */}
      {tab === "messages" ? (
        conversations.length === 0 ? (
          <div className="text-center py-20">
            <BellRing size={40} className="mx-auto mb-3 opacity-20 text-white" />
            <p className="text-white/40 text-sm">No conversations yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map(c => {
              const preview = c.lastMessage
                ? `${c.lastMessage.senderId === myId ? "You: " : ""}${c.lastMessage.body}`
                : "No messages yet"
              return (
                <button
                  key={c._id}
                  onClick={() => openConversation(c)}
                  className="relative flex items-center gap-4 px-5 py-4 w-full text-left transition-colors"
                  style={{
                    ...cardStyle,
                    background: c.unread > 0 ? "rgba(28,30,42,0.80)" : "rgba(28,30,42,0.50)",
                    cursor: "pointer",
                  }}
                >
                  <Avatar name={c.other.name} url={c.other.avatar} online={c.other.isOnline} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="text-[16px] font-semibold leading-snug truncate"
                         style={{ color: c.unread > 0 ? "white" : "rgba(255,255,255,0.6)" }}>
                        {c.other.name}
                      </p>
                      {c.lastMessage && (
                        <p className="text-[11px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.35)" }}>
                          {formatRelative(c.lastMessage.createdAt)}
                        </p>
                      )}
                    </div>
                    <p className="text-[13px] mt-1 leading-relaxed truncate"
                       style={{ color: c.unread > 0 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.45)" }}>
                      {preview}
                    </p>
                  </div>
                  {c.unread > 0 && (
                    <span style={{
                      background: NEON.messages.hex, color: "#fff",
                      minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999,
                      fontSize: 11, fontWeight: 700, flexShrink: 0,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {c.unread > 99 ? "99+" : c.unread}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                height:       64,
                borderRadius: 12,
                background:   "rgba(28,30,42,0.50)",
                border:       "1px solid rgba(188,188,201,0.10)",
                animation:    "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="text-center py-20">
          <BellRing size={40} className="mx-auto mb-3 opacity-20 text-white" />
          <p className="text-white/40 text-sm">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleItems.map(n => (
            <NotificationRow
              key={n._id}
              notif={n}
              onRead={handleMarkRead}
              onDelete={handleDelete}
              onNavigate={(slug) => {
                handleMarkRead(n._id)
                if (slug) router.push(`/game/${slug}`)
              }}
            />
          ))}

          {/* Infinite scroll trigger */}
          {hasMore && (
            <div ref={loaderRef} className="py-4 text-center text-white/30 text-sm">
              {loadingMore ? "Loading more…" : ""}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NotificationRow({ notif, onRead, onDelete, onNavigate }: {
  notif: Notification
  onRead: (id: string) => void
  onDelete: (id: string) => void
  onNavigate: (slug: string | null) => void
}) {
  // Row buttons follow the row's TYPE color: events = purple, discounts = green
  const palette     = notif.type === "event" ? NEON.events : NEON.discounts
  const accentColor = palette.hex
  const accentRgb   = palette.rgb
  const clickable   = !!(notif.gameSlug || notif.link)

  return (
    <div
      className="relative flex items-center gap-4 px-5 py-4 transition-colors"
      style={{
        ...cardStyle,
        background: notif.read
          ? "rgba(28,30,42,0.50)"
          : "rgba(28,30,42,0.80)",
        cursor:     clickable ? "pointer" : "default",
      }}
      onClick={() => onNavigate(notif.gameSlug)}
    >
      {/* Unread dot — left edge, vertically centered */}
      {!notif.read && (
        <span
          className="flex-shrink-0"
          style={{ width: 8, height: 8, borderRadius: "50%", background: accentColor }}
          aria-hidden
        />
      )}

      {/* Title + body — main column */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-4">
          <p
            className="text-[16px] font-semibold leading-snug truncate"
            style={{ color: notif.read ? "rgba(255,255,255,0.6)" : "white" }}
          >
            {notif.title}
          </p>
          <p
            className="text-[11px] flex-shrink-0"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            {formatRelative(notif.createdAt)}
          </p>
        </div>
        {notif.body && (
          <p
            className="text-[13px] mt-1 leading-relaxed truncate"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            {notif.body}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
        {!notif.read && (
          <button
            onClick={() => onRead(notif._id)}
            className="text-[14px] font-semibold transition-colors"
            style={{
              color:        accentColor,
              background:   `rgba(${accentRgb},0.10)`,
              border:       "none",
              borderRadius: 999,
              padding:      "6px 16px",
              cursor:       "pointer",
            }}
          >
            Read
          </button>
        )}
        <button
          onClick={() => onDelete(notif._id)}
          aria-label="Dismiss"
          style={{ background: "none", border: "none", padding: "4px", cursor: "pointer", color: "rgba(255,255,255,0.35)", fontSize: 18, lineHeight: 1, display: "flex", alignItems: "center" }}
        >
          ×
        </button>
      </div>
    </div>
  )
}
