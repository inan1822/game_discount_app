"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { BellRing, Tag, Zap, CheckCheck } from "lucide-react"
import { getNotifications, markRead, markAllRead } from "@/features/notifications/services/notifications"
import { useChat } from "@/features/chat/state/ChatContext"
import Avatar from "@/components/friends/Avatar"
import type { Notification } from "@/shared/types/notification"

interface Props {
  open:        boolean
  onClose:     () => void
  /** Called after the user marks something read so the parent's unread count refreshes */
  onMutated?:  () => void
  /** Anchor position — popover floats below the bell icon */
  anchor?:     "left" | "right"
}

function relativeTime(iso: string): string {
  const diffSec = (Date.now() - new Date(iso).getTime()) / 1000
  if (diffSec < 60)    return "just now"
  if (diffSec < 3600)  return `${Math.round(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h ago`
  return `${Math.round(diffSec / 86400)}d ago`
}

export default function NotificationPopover({ open, onClose, onMutated, anchor = "right" }: Props) {
  const router          = useRouter()
  const wrapRef         = useRef<HTMLDivElement>(null)
  const [items, setItems]     = useState<Notification[] | null>(null)
  const [loading, setLoading] = useState(false)

  const { myId, conversations, openConversation, refreshConversations } = useChat()
  const unreadConvos = conversations.filter(c => c.unread > 0)

  // Load latest 8 notifications + refresh conversations when opened
  useEffect(() => {
    if (!open) return
    setLoading(true)
    refreshConversations()
    getNotifications(8)
      .then(page => setItems(page.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onClose()
    }
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onEsc)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onEsc)
    }
  }, [open, onClose])

  async function handleClick(n: Notification) {
    if (!n.read) {
      try { await markRead(n._id); onMutated?.() } catch {}
    }
    if (n.link) {
      window.open(n.link, "_blank", "noopener")
    } else if (n.gameId) {
      router.push(`/game/${n.gameId}`)
    } else {
      router.push("/notifications")
    }
    onClose()
  }

  async function handleMarkAll() {
    try {
      await markAllRead()
      setItems(prev => prev?.map(n => ({ ...n, read: true })) ?? [])
      onMutated?.()
    } catch {}
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={wrapRef}
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{    opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.18 }}
          className="absolute top-full mt-3 z-[200]"
          style={{
            width:                360,
            maxHeight:            520,
            [anchor]:             0,
            background:           "rgba(30,38,51,0.85)",
            backdropFilter:       "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            borderRadius:         12,
            border:               "1px solid rgba(255,255,255,0.07)",
            boxShadow:            "0 16px 48px rgba(0,0,0,0.6)",
            display:              "flex",
            flexDirection:        "column",
            overflow:             "hidden",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="flex items-center gap-2">
              <BellRing size={14} style={{ color: "#48BCF9" }} />
              <span className="text-white text-[13px] font-bold">Notifications</span>
            </div>
            {items && items.some(n => !n.read) && (
              <motion.button
                onClick={handleMarkAll}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="text-[10px] font-semibold flex items-center gap-1"
                style={{ color: "#48BCF9" }}
              >
                <CheckCheck size={11} /> Mark all read
              </motion.button>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {loading ? (
              <div className="p-4 space-y-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="h-14 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
                ))}
              </div>
            ) : (
            <>
              {/* Messages section — unread conversations */}
              {unreadConvos.length > 0 && (
                <>
                  <div className="px-4 pt-3 pb-1 text-[10px] font-bold tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
                    MESSAGES
                  </div>
                  {unreadConvos.slice(0, 4).map(c => (
                    <motion.button
                      key={c._id}
                      onClick={() => { openConversation(c); onClose() }}
                      whileHover={{ backgroundColor: "rgba(255,255,255,0.04)" }}
                      className="w-full text-left px-4 py-3 flex gap-3 items-center"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", background: "#6475D10d", cursor: "pointer" }}
                    >
                      <Avatar name={c.other.name} url={c.other.avatar} online={c.other.isOnline} size={28} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-[12px] font-semibold leading-tight truncate">{c.other.name}</p>
                        {c.lastMessage && (
                          <p className="text-[10.5px] mt-0.5 leading-snug truncate" style={{ color: "rgba(255,255,255,0.45)" }}>
                            {c.lastMessage.senderId === myId ? "You: " : ""}{c.lastMessage.body}
                          </p>
                        )}
                      </div>
                      <span style={{
                        background: "#6475D1", color: "#fff", minWidth: 18, height: 18, padding: "0 5px",
                        borderRadius: 999, fontSize: 10, fontWeight: 700, flexShrink: 0,
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {c.unread > 99 ? "99+" : c.unread}
                      </span>
                    </motion.button>
                  ))}
                </>
              )}

              {/* Notifications section */}
              {!items || items.length === 0 ? (
                unreadConvos.length === 0 && (
                  <div className="text-center py-12 px-4">
                    <BellRing size={24} className="mx-auto mb-2" style={{ color: "rgba(255,255,255,0.18)" }} />
                    <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                      No notifications yet
                    </p>
                  </div>
                )
              ) : (
              <>
                {unreadConvos.length > 0 && (
                  <div className="px-4 pt-3 pb-1 text-[10px] font-bold tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
                    NOTIFICATIONS
                  </div>
                )}
                {items.map(n => {
                const isEvent = n.type === "event"
                const accent  = isEvent ? "#AE3BD6" : "#44d62c"
                return (
                  <motion.button
                    key={n._id}
                    onClick={() => handleClick(n)}
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.04)" }}
                    className="w-full text-left px-4 py-3 flex gap-3 items-start"
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                      background:   n.read ? "transparent" : `${accent}0d`,
                      cursor:       "pointer",
                    }}
                  >
                    {/* Type icon */}
                    <div
                      className="flex-shrink-0 mt-0.5 flex items-center justify-center"
                      style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: `${accent}22`,
                        color:      accent,
                      }}
                    >
                      {isEvent ? <Zap size={14} /> : <Tag size={14} />}
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <p className="text-white text-[12px] font-semibold leading-tight line-clamp-2 flex-1">
                          {n.title}
                        </p>
                        {!n.read && (
                          <span
                            className="flex-shrink-0 mt-1"
                            style={{ width: 6, height: 6, borderRadius: "50%", background: accent }}
                          />
                        )}
                      </div>
                      {n.body && (
                        <p
                          className="text-[10.5px] mt-1 leading-snug line-clamp-2"
                          style={{ color: "rgba(255,255,255,0.45)" }}
                        >
                          {n.body}
                        </p>
                      )}
                      <p
                        className="text-[9.5px] mt-1 font-medium"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      >
                        {relativeTime(n.createdAt)}
                      </p>
                    </div>
                  </motion.button>
                )
              })}
              </>
              )}
            </>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex-shrink-0 px-4 py-2.5"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            <motion.button
              onClick={() => { router.push("/notifications"); onClose() }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full text-[11px] font-semibold py-2"
              style={{
                background:   "rgba(72,188,249,0.10)",
                color:        "#48BCF9",
                borderRadius: 8,
                border:       "1px solid rgba(72,188,249,0.18)",
              }}
            >
              See all notifications
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
