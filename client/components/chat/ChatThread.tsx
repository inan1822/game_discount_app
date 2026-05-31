"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Check, CheckCheck, AlertCircle } from "lucide-react"
import { useChat } from "@/context/ChatContext"

export default function ChatThread() {
  const {
    myId, activeMeta, messages, hasMore, loading, typingFrom,
    sendMessage, loadOlder, notifyTyping,
  } = useChat()

  const [text, setText] = useState("")
  const endRef    = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages (mirrors SupportDrawer).
  useEffect(() => {
    const t = setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 60)
    return () => clearTimeout(t)
  }, [messages.length, typingFrom])

  // Load older history when scrolled near the top.
  function onScroll() {
    if (!scrollRef.current || !hasMore) return
    if (scrollRef.current.scrollTop < 40) {
      const prevH = scrollRef.current.scrollHeight
      loadOlder().then(() => {
        requestAnimationFrame(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevH
        })
      })
    }
  }

  const limited = activeMeta ? !activeMeta.isMutual : false
  const remaining = activeMeta?.remaining ?? null
  const blocked = limited && remaining !== null && remaining <= 0

  function handleSend() {
    if (!text.trim() || blocked) return
    sendMessage(text)
    setText("")
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{ flex: 1, overflowY: "auto", padding: "12px 14px", minHeight: 0 }}
      >
        {loading && messages.length === 0 ? (
          <p style={{ color: "#9fa0a1", fontSize: 12, textAlign: "center", paddingTop: 20 }}>Loading…</p>
        ) : messages.length === 0 ? (
          <p style={{ color: "#9fa0a1", fontSize: 12, textAlign: "center", paddingTop: 20 }}>
            No messages yet. Say hi 👋
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.map(m => {
              const mine = m.senderId === myId
              return (
                <div key={m._id} style={{ display: "flex", flexDirection: mine ? "row-reverse" : "row" }}>
                  <div
                    style={{
                      maxWidth: "76%",
                      background: mine ? "rgba(100,117,209,0.18)" : "rgba(28,30,42,0.80)",
                      border: `1px solid ${mine ? "rgba(100,117,209,0.30)" : "rgba(31,37,57,0.6)"}`,
                      borderRadius: mine ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                      padding: "8px 12px",
                      opacity: m.pending ? 0.6 : 1,
                    }}
                  >
                    <p style={{ color: "#fff", fontSize: 13, lineHeight: 1.45, margin: 0, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                      {m.body}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 3 }}>
                      <span style={{ color: "#9fa0a1", fontSize: 10 }}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {mine && m.failed && <AlertCircle className="w-3 h-3" style={{ color: "#ef4444" }} />}
                      {mine && !m.failed && !m.pending && (
                        m.read
                          ? <CheckCheck className="w-3 h-3" style={{ color: "#48BCF9" }} />
                          : <Check className="w-3 h-3" style={{ color: "#9fa0a1" }} />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {typingFrom && (
              <p style={{ color: "#9fa0a1", fontSize: 11, fontStyle: "italic", paddingLeft: 4 }}>typing…</p>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Non-mutual quota banner */}
      {limited && (
        <div style={{
          padding: "6px 14px", flexShrink: 0,
          borderTop: "1px solid rgba(31,37,57,0.6)",
          background: blocked ? "rgba(239,68,68,0.08)" : "rgba(100,117,209,0.06)",
        }}>
          <p style={{ color: blocked ? "#ef4444" : "#9fa0a1", fontSize: 11, margin: 0 }}>
            {blocked
              ? "Message limit reached — they need to follow you back to chat freely."
              : `${remaining}/3 messages left today (they don't follow you back yet).`}
          </p>
        </div>
      )}

      {/* Composer */}
      <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderTop: "1px solid rgba(31,37,57,0.6)", flexShrink: 0 }}>
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); notifyTyping() }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder={blocked ? "Message limit reached" : "Type a message…"}
          disabled={blocked}
          rows={1}
          style={{
            flex: 1, background: "#12131a", border: "1px solid rgba(31,37,57,0.6)",
            borderRadius: 10, color: "#fff", fontSize: 13, padding: "9px 12px",
            outline: "none", resize: "none", fontFamily: "inherit", maxHeight: 90,
            opacity: blocked ? 0.5 : 1,
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || blocked}
          style={{
            background: text.trim() && !blocked ? "#6475D1" : "rgba(100,117,209,0.20)",
            border: "none", borderRadius: 10, padding: "0 13px", flexShrink: 0,
            cursor: text.trim() && !blocked ? "pointer" : "not-allowed", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          aria-label="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
