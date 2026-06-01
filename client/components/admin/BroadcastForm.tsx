"use client"
import { useState } from "react"
import { Send, Clock, Users, Mail } from "lucide-react"
import { sendBroadcast, fetchBroadcastHistory } from "@/lib/api/admin.client"
import type { BroadcastHistory } from "@/shared/types/admin"

const PANEL: React.CSSProperties = {
  background: "rgba(28,30,42,0.70)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border: "1px solid rgba(188,188,201,0.15)",
  borderRadius: 10,
}
const INPUT: React.CSSProperties = {
  background: "#1c1e2a",
  border: "1px solid rgba(188,188,201,0.15)",
  borderRadius: 10, color: "#fff",
  fontSize: 13, padding: "9px 12px", outline: "none", width: "100%",
}
const LABEL: React.CSSProperties = {
  color: "#9fa0a1", fontSize: 11, fontWeight: 700,
  letterSpacing: "0.08em", textTransform: "uppercase" as const,
  display: "block", marginBottom: 6,
}

interface Props {
  initialHistory: BroadcastHistory[]
}

export function BroadcastForm({ initialHistory }: Props) {
  const [title,     setTitle]     = useState("")
  const [body,      setBody]      = useState("")
  const [type,      setType]      = useState<"announcement" | "event" | "discount">("announcement")
  const [target,    setTarget]    = useState<"all" | "verified">("all")
  const [sendEmail, setSendEmail] = useState(false)
  const [sending,   setSending]   = useState(false)
  const [result,    setResult]    = useState<{ sent: number; emailsSent: number } | null>(null)
  const [error,     setError]     = useState<string | null>(null)
  const [history,   setHistory]   = useState<BroadcastHistory[]>(initialHistory)

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    setSending(true)
    setError(null)
    setResult(null)
    try {
      const res = await sendBroadcast({ title, body, type, target, sendEmail })
      setResult(res)
      setTitle(""); setBody("")
      // Refresh history
      const hist = await fetchBroadcastHistory()
      setHistory(hist)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? "Failed to send broadcast")
    } finally {
      setSending(false)
    }
  }

  const TYPE_COLOR: Record<string, string> = {
    announcement: "#6475D1",
    event:        "#AE3BD6",
    discount:     "#44d62c",
  }

  return (
    <div className="space-y-6">
      {/* Compose form */}
      <div style={{ ...PANEL, padding: 24 }}>
        <div className="flex items-center gap-3 mb-6">
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(100,117,209,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Send className="w-4 h-4" style={{ color: "#6475D1" }} />
          </div>
          <div>
            <p style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>Send Broadcast</p>
            <p style={{ color: "#9fa0a1", fontSize: 12 }}>Push an in-app notification to all or verified users</p>
          </div>
        </div>

        <form onSubmit={handleSend} className="space-y-4">
          {/* Title */}
          <div>
            <label style={LABEL}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Weekend Sale is live!" required style={INPUT} maxLength={200} />
          </div>

          {/* Body */}
          <div>
            <label style={LABEL}>Message *</label>
            <textarea value={body} onChange={e => setBody(e.target.value)}
              placeholder="Write your message to users…"
              required rows={4}
              style={{ ...INPUT, resize: "vertical" as const, minHeight: 96 }} />
          </div>

          {/* Type + Target row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label style={LABEL}>Notification type</label>
              <select value={type} onChange={e => setType(e.target.value as typeof type)}
                style={{ ...INPUT, cursor: "pointer" }}>
                <option value="announcement">Announcement</option>
                <option value="event">In-game Event</option>
                <option value="discount">Discount / Sale</option>
              </select>
            </div>
            <div>
              <label style={LABEL}>Target audience</label>
              <select value={target} onChange={e => setTarget(e.target.value as typeof target)}
                style={{ ...INPUT, cursor: "pointer" }}>
                <option value="all">All users</option>
                <option value="verified">Verified users only</option>
              </select>
            </div>
          </div>

          {/* Send email toggle */}
          <div className="flex items-center gap-3 p-3" style={{
            background: "rgba(100,117,209,0.08)",
            border: "1px solid rgba(100,117,209,0.15)",
            borderRadius: 10,
          }}>
            <button type="button"
              onClick={() => setSendEmail(v => !v)}
              style={{
                width: 36, height: 20, borderRadius: 999,
                background: sendEmail ? "#6475D1" : "rgba(188,188,201,0.20)",
                border: "none", cursor: "pointer", position: "relative",
                transition: "background 0.2s", flexShrink: 0,
              }}>
              <div style={{
                width: 16, height: 16, borderRadius: "50%", background: "#fff",
                position: "absolute", top: 2,
                left: sendEmail ? 18 : 2,
                transition: "left 0.2s",
              }} />
            </button>
            <Mail className="w-4 h-4" style={{ color: sendEmail ? "#6475D1" : "#9fa0a1" }} />
            <span style={{ color: sendEmail ? "#fff" : "#9fa0a1", fontSize: 13 }}>
              Also send as email
            </span>
          </div>

          {/* Preview */}
          {(title || body) && (
            <div style={{
              background: "rgba(28,30,42,0.50)",
              border: `1px solid ${TYPE_COLOR[type] ?? "#6475D1"}30`,
              borderRadius: 10, padding: "12px 16px",
            }}>
              <p style={{ fontSize: 11, color: "#9fa0a1", marginBottom: 6 }}>PREVIEW</p>
              <div style={{
                borderLeft: `3px solid ${TYPE_COLOR[type] ?? "#6475D1"}`,
                paddingLeft: 12,
              }}>
                <p style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{title || "…"}</p>
                <p style={{ color: "#b3bade", fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>{body || "…"}</p>
              </div>
            </div>
          )}

          {error && (
            <p style={{ color: "#ef4444", fontSize: 13,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)",
              borderRadius: 8, padding: "8px 12px" }}>
              {error}
            </p>
          )}
          {result && (
            <div style={{
              color: "#44d62c", fontSize: 13,
              background: "rgba(68,214,44,0.08)", border: "1px solid rgba(68,214,44,0.20)",
              borderRadius: 8, padding: "10px 14px",
            }}>
              ✓ Sent to {result.sent} user{result.sent !== 1 ? "s" : ""}
              {result.emailsSent > 0 && ` · ${result.emailsSent} email${result.emailsSent !== 1 ? "s" : ""} sent`}
            </div>
          )}

          <button type="submit" disabled={sending || !title.trim() || !body.trim()}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", background: sending ? "rgba(100,117,209,0.40)" : "#6475D1",
              color: "#fff", border: "none", borderRadius: 10,
              padding: "12px 0", fontSize: 14, fontWeight: 700,
              cursor: sending || !title.trim() || !body.trim() ? "not-allowed" : "pointer",
            }}>
            <Send className="w-4 h-4" />
            {sending ? "Sending…" : "Send Broadcast"}
          </button>
        </form>
      </div>

      {/* Sent history */}
      {history.length > 0 && (
        <div style={PANEL} className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4" style={{ color: "#9fa0a1" }} />
            <p style={{ color: "#9fa0a1", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Recent broadcasts
            </p>
          </div>
          <div className="space-y-3">
            {history.map((h, i) => (
              <div key={i} style={{
                padding: "12px 0",
                borderBottom: i < history.length - 1 ? "1px solid rgba(188,188,201,0.06)" : "none",
              }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{h.title}</p>
                    <p style={{ color: "#9fa0a1", fontSize: 12, marginTop: 2,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {h.body}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="flex items-center gap-1" style={{ color: "#9fa0a1", fontSize: 11 }}>
                      <Users className="w-3 h-3" />
                      {h.recipients}
                    </div>
                    <p style={{ color: "#9fa0a1", fontSize: 11 }}>
                      {new Date(h.sentAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
