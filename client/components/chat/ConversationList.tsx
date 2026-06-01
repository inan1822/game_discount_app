"use client"

import Avatar from "@/components/friends/Avatar"
import { useChat } from "@/features/chat/state/ChatContext"

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return "now"
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default function ConversationList() {
  const { conversations, myId, openConversation } = useChat()

  return (
    <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
      {conversations.length === 0 ? (
        <p style={{ color: "#9fa0a1", fontSize: 12, textAlign: "center", padding: "32px 16px" }}>
          No conversations yet. Open a friend&apos;s profile and tap Message.
        </p>
      ) : (
        conversations.map(c => {
          const preview = c.lastMessage
            ? `${c.lastMessage.senderId === myId ? "You: " : ""}${c.lastMessage.body}`
            : "No messages yet"
          return (
            <button
              key={c._id}
              onClick={() => openConversation(c)}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "10px 12px", background: "none", border: "none",
                borderBottom: "1px solid rgba(31,37,57,0.4)", cursor: "pointer", textAlign: "left",
              }}
            >
              <Avatar name={c.other.name} url={c.other.avatar} online={c.other.isOnline} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }} className="truncate">{c.other.name}</span>
                  {c.lastMessage && <span style={{ color: "#9fa0a1", fontSize: 10, flexShrink: 0 }}>{timeAgo(c.lastMessage.createdAt)}</span>}
                </div>
                <span
                  className="truncate"
                  style={{ display: "block", color: c.unread > 0 ? "#b3bade" : "#9fa0a1", fontSize: 12, fontWeight: c.unread > 0 ? 600 : 400 }}
                >
                  {preview}
                </span>
              </div>
              {c.unread > 0 && (
                <span style={{
                  background: "#6475D1", color: "#fff", minWidth: 18, height: 18, padding: "0 5px",
                  borderRadius: 999, fontSize: 10, fontWeight: 700, flexShrink: 0,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}>
                  {c.unread}
                </span>
              )}
            </button>
          )
        })
      )}
    </div>
  )
}
