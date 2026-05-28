"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { BellRing, CheckCheck } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useUnreadCount } from "@/hooks/useUnreadCount"
import {
  getNotifications, markRead, markAllRead, deleteNotification,
} from "@/lib/api/notifications"
import type { Notification } from "@/types/notification"

const cardStyle = {
  background: "rgba(28,30,42,0.70)",
  border: "1px solid rgba(255,255,255,0.05)",
  borderRadius: 14,
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
} as const

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

  const [tab, setTab] = useState<"all" | "events" | "discounts">("all")
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

  useEffect(() => { load(true) }, [user?._id, tab])

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
    <div className="flex-1 min-w-0 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <div className="max-w-2xl mx-auto px-8 py-10">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-white text-2xl font-bold">Notifications</h1>
              {counts.total > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1.5 text-[12px] font-medium transition-colors hover:text-white"
                  style={{ color: "#48BCF9", background: "transparent", border: "none", cursor: "pointer" }}
                >
                  <CheckCheck size={14} />
                  Mark all read
                </button>
              )}
            </div>

            {/* Tab bar */}
            <div
              className="flex gap-1.5 mb-6 p-1"
              style={{ background: "rgba(28,30,42,0.70)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}
            >
              {(["all", "events", "discounts"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="flex-1 py-1.5 text-[12px] font-medium capitalize transition-colors"
                  style={{
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    background: tab === t
                      ? t === "events"    ? "rgba(168,85,247,0.18)"
                      : t === "discounts" ? "rgba(34,197,94,0.18)"
                      : "rgba(72,188,249,0.15)"
                      : "transparent",
                    color: tab === t
                      ? t === "events"    ? "#A855F7"
                      : t === "discounts" ? "#22C55E"
                      : "#48BCF9"
                      : "rgba(255,255,255,0.4)",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Notification list */}
            {loading ? (
              <div className="text-white/40 text-sm text-center py-12">Loading…</div>
            ) : visibleItems.length === 0 ? (
              <div className="text-center py-16">
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
        </div>
  )
}

function NotificationRow({ notif, onRead, onDelete, onNavigate }: {
  notif: Notification
  onRead: (id: string) => void
  onDelete: (id: string) => void
  onNavigate: (slug: string | null) => void
}) {
  const accentColor = notif.type === "event" ? "#A855F7" : "#22C55E"

  return (
    <div
      className="relative flex items-start gap-3 px-4 py-3 transition-colors"
      style={{
        ...cardStyle,
        borderRadius: 12,
        borderLeft: `4px solid ${accentColor}`,
        background: notif.read
          ? "rgba(28,30,42,0.50)"
          : "rgba(28,30,42,0.80)",
        cursor: notif.gameSlug || notif.link ? "pointer" : "default",
      }}
      onClick={() => onNavigate(notif.gameSlug)}
    >
      {/* Unread dot */}
      {!notif.read && (
        <span
          className="absolute right-3 top-3"
          style={{ width: 6, height: 6, borderRadius: "50%", background: accentColor, display: "inline-block" }}
        />
      )}

      <div className="flex-1 min-w-0">
        <p
          className="text-[13px] font-semibold leading-snug"
          style={{ color: notif.read ? "rgba(255,255,255,0.6)" : "white" }}
        >
          {notif.title}
        </p>
        {notif.body && (
          <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
            {notif.body}
          </p>
        )}
        <p className="text-[10px] mt-1.5" style={{ color: "rgba(255,255,255,0.25)" }}>
          {formatRelative(notif.createdAt)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
        {!notif.read && (
          <button
            onClick={() => onRead(notif._id)}
            className="text-[10px] transition-colors hover:text-white"
            style={{ color: "#48BCF9", background: "transparent", border: "none", cursor: "pointer", padding: "2px 4px" }}
          >
            Read
          </button>
        )}
        <button
          onClick={() => onDelete(notif._id)}
          className="text-[10px] transition-colors hover:text-white"
          style={{ color: "rgba(255,255,255,0.3)", background: "transparent", border: "none", cursor: "pointer", padding: "2px 4px" }}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
