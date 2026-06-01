"use client"

import { useState, useRef, useEffect } from "react"
import {
  X, ChevronRight, Send, MessageCircle,
  AlertCircle, Key, RefreshCw, ShoppingBag,
  Package, HelpCircle, Globe,
} from "@/shared/icons"
import { createTicket, addTicketMessage } from "@/features/friends/services/support"
import type { Ticket, TicketSubject } from "@/shared/types/support"
import { SUBJECT_LABELS, STATUS_LABELS, STATUS_COLORS } from "@/shared/types/support"

// ── Types ─────────────────────────────────────────────────────────────────────

interface SupportDrawerProps {
  open:        boolean
  onClose:     () => void
  orderId:     string
  productName: string
  /** Pass an existing ticket to open a thread directly */
  ticket?:     Ticket | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SUBJECT_ICONS: Record<TicketSubject, React.ElementType> = {
  key_not_working:  AlertCircle,
  key_already_used: Key,
  wrong_region:     Globe,
  bought_by_mistake:ShoppingBag,
  wrong_product:    Package,
  missing_key:      HelpCircle,
  other:            MessageCircle,
}

const SUBJECTS = Object.keys(SUBJECT_LABELS) as TicketSubject[]

// ── Styles ────────────────────────────────────────────────────────────────────

const PANEL: React.CSSProperties = {
  background:          "rgba(28,30,42,0.70)",
  backdropFilter:      "blur(8px)",
  WebkitBackdropFilter:"blur(8px)",
  border:              "1px solid rgba(188,188,201,0.15)",
  borderRadius:        10,
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SupportDrawer({
  open, onClose, orderId, productName, ticket: existingTicket,
}: SupportDrawerProps) {
  // step 1 = subject picker, step 2 = description, step 3 = thread
  const [step,        setStep]        = useState<1 | 2 | 3>(existingTicket ? 3 : 1)
  const [subject,     setSubject]     = useState<TicketSubject | null>(null)
  const [description, setDescription] = useState("")
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [ticket,      setTicket]      = useState<Ticket | null>(existingTicket ?? null)
  const [reply,       setReply]       = useState("")
  const [sending,     setSending]     = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Reset when drawer opens/closes
  useEffect(() => {
    if (!open) return
    if (existingTicket) {
      setTicket(existingTicket)
      setStep(3)
    } else {
      setStep(1)
      setSubject(null)
      setDescription("")
      setError(null)
    }
  }, [open, existingTicket])

  // Scroll to bottom of messages
  useEffect(() => {
    if (step === 3) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
    }
  }, [step, ticket?.messages.length])

  async function handleSubmit() {
    if (!subject || description.trim().length < 10) return
    setSubmitting(true)
    setError(null)
    try {
      const created = await createTicket({ orderId, subject, description: description.trim() })
      setTicket(created)
      setStep(3)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e?.response?.data?.message ?? "Failed to submit ticket. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSendReply() {
    if (!ticket || !reply.trim()) return
    setSending(true)
    try {
      const updated = await addTicketMessage(ticket._id, reply.trim())
      setTicket(updated)
      setReply("")
    } catch {
      // silent — show message in UI if needed
    } finally {
      setSending(false)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.60)", backdropFilter: "blur(4px)",
        }}
      />

      {/* Drawer */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1001,
        maxWidth: 540, margin: "0 auto",
        background: "#1c1e2a",
        borderRadius: "16px 16px 0 0",
        border: "1px solid rgba(188,188,201,0.15)",
        borderBottom: "none",
        display: "flex", flexDirection: "column",
        maxHeight: "85vh",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid rgba(188,188,201,0.10)",
          flexShrink: 0,
        }}>
          <div>
            <p style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>
              {step === 3 && ticket ? `Ticket #${ticket.orderRef}` : "Contact Support"}
            </p>
            <p style={{ color: "#9fa0a1", fontSize: 12, marginTop: 2 }}>
              {productName}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {step === 3 && ticket && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "3px 10px",
                borderRadius: 999, background: `${STATUS_COLORS[ticket.status]}22`,
                color: STATUS_COLORS[ticket.status],
                border: `1px solid ${STATUS_COLORS[ticket.status]}44`,
              }}>
                {STATUS_LABELS[ticket.status]}
              </span>
            )}
            <button onClick={onClose} style={{
              background: "rgba(188,188,201,0.08)", border: "none",
              borderRadius: 8, padding: 6, cursor: "pointer", color: "#9fa0a1",
              display: "flex", alignItems: "center",
            }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>

          {/* Step 1 — Subject picker */}
          {step === 1 && (
            <div>
              <p style={{ color: "#9fa0a1", fontSize: 13, marginBottom: 16 }}>
                What do you need help with?
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {SUBJECTS.map(s => {
                  const Icon = SUBJECT_ICONS[s]
                  const isSelected = subject === s
                  return (
                    <button
                      key={s}
                      onClick={() => setSubject(s)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        background: isSelected
                          ? "rgba(100,117,209,0.15)"
                          : "rgba(255,255,255,0.04)",
                        border: isSelected
                          ? "1px solid rgba(100,117,209,0.40)"
                          : "1px solid rgba(188,188,201,0.10)",
                        borderRadius: 10, padding: "12px 16px", cursor: "pointer",
                        textAlign: "left", width: "100%",
                        transition: "all 0.15s",
                      }}
                    >
                      <Icon
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: isSelected ? "#6475D1" : "#9fa0a1" }}
                      />
                      <span style={{
                        color: isSelected ? "#fff" : "#b3bade",
                        fontSize: 14, fontWeight: isSelected ? 600 : 400, flex: 1,
                      }}>
                        {SUBJECT_LABELS[s]}
                      </span>
                      <ChevronRight
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: isSelected ? "#6475D1" : "rgba(188,188,201,0.30)" }}
                      />
                    </button>
                  )
                })}
              </div>

              <button
                disabled={!subject}
                onClick={() => setStep(2)}
                style={{
                  marginTop: 20, width: "100%",
                  background: subject ? "#6475D1" : "rgba(100,117,209,0.20)",
                  color: subject ? "#fff" : "#6475D1",
                  border: "none", borderRadius: 10, padding: "12px 0",
                  fontSize: 14, fontWeight: 700, cursor: subject ? "pointer" : "not-allowed",
                  opacity: subject ? 1 : 0.5,
                }}
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2 — Description */}
          {step === 2 && subject && (
            <div>
              <button
                onClick={() => setStep(1)}
                style={{
                  background: "none", border: "none", color: "#9fa0a1",
                  fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16,
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                ← Back
              </button>

              <div style={{ ...PANEL, padding: "10px 14px", marginBottom: 16,
                display: "flex", alignItems: "center", gap: 8 }}>
                {(() => {
                  const Icon = SUBJECT_ICONS[subject]
                  return <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "#6475D1" }} />
                })()}
                <span style={{ color: "#b3bade", fontSize: 13, fontWeight: 600 }}>
                  {SUBJECT_LABELS[subject]}
                </span>
              </div>

              <p style={{ color: "#9fa0a1", fontSize: 13, marginBottom: 8 }}>
                Please describe the issue in detail:
              </p>

              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="E.g. I entered the key on Steam but it says it is already in use. I purchased it just now."
                rows={6}
                style={{
                  width: "100%", background: "#12131a",
                  border: "1px solid rgba(188,188,201,0.15)",
                  borderRadius: 10, color: "#fff", fontSize: 13,
                  padding: "12px 14px", outline: "none",
                  resize: "vertical", fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
              <p style={{ color: description.length < 10 ? "#9fa0a1" : "#44d62c",
                fontSize: 11, marginTop: 4 }}>
                {description.length} / 3000 chars {description.length < 10 ? "(min 10)" : ""}
              </p>

              {error && (
                <p style={{ color: "#ef4444", fontSize: 13, marginTop: 8 }}>{error}</p>
              )}

              <button
                disabled={submitting || description.trim().length < 10}
                onClick={handleSubmit}
                style={{
                  marginTop: 16, width: "100%",
                  background: description.trim().length >= 10 ? "#6475D1" : "rgba(100,117,209,0.20)",
                  color: description.trim().length >= 10 ? "#fff" : "#6475D1",
                  border: "none", borderRadius: 10, padding: "12px 0",
                  fontSize: 14, fontWeight: 700,
                  cursor: submitting || description.trim().length < 10 ? "not-allowed" : "pointer",
                  opacity: submitting || description.trim().length < 10 ? 0.5 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                {submitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <><MessageCircle className="w-4 h-4" /> Submit Ticket</>
                )}
              </button>
            </div>
          )}

          {/* Step 3 — Thread */}
          {step === 3 && ticket && (
            <div>
              {/* Messages */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                {ticket.messages.map((msg, i) => {
                  const isAdmin = msg.senderRole === "admin"
                  return (
                    <div key={i} style={{
                      display: "flex",
                      flexDirection: isAdmin ? "row" : "row-reverse",
                      gap: 8, alignItems: "flex-end",
                    }}>
                      {/* Avatar */}
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                        background: isAdmin ? "rgba(100,117,209,0.20)" : "rgba(68,214,44,0.12)",
                        border: `1px solid ${isAdmin ? "rgba(100,117,209,0.30)" : "rgba(68,214,44,0.20)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 700,
                        color: isAdmin ? "#6475D1" : "#44d62c",
                      }}>
                        {isAdmin ? "S" : "U"}
                      </div>
                      <div style={{
                        maxWidth: "76%",
                        background: isAdmin ? "rgba(100,117,209,0.10)" : "rgba(28,30,42,0.80)",
                        border: `1px solid ${isAdmin ? "rgba(100,117,209,0.20)" : "rgba(188,188,201,0.12)"}`,
                        borderRadius: isAdmin ? "10px 10px 10px 2px" : "10px 10px 2px 10px",
                        padding: "10px 14px",
                      }}>
                        <p style={{ color: "#9fa0a1", fontSize: 10, marginBottom: 4 }}>
                          {isAdmin ? "Support" : "You"} · {new Date(msg.createdAt).toLocaleString()}
                        </p>
                        <p style={{ color: "#fff", fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                          {msg.body}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Ticket closed notice */}
              {(ticket.status === "closed" || ticket.status === "resolved") && (
                <div style={{
                  ...PANEL, padding: "10px 14px", marginBottom: 12,
                  background: "rgba(68,214,44,0.06)",
                  border: "1px solid rgba(68,214,44,0.20)",
                }}>
                  <p style={{ color: "#44d62c", fontSize: 13, fontWeight: 600 }}>
                    ✓ Ticket {ticket.status === "resolved" ? "resolved" : "closed"}
                  </p>
                  <p style={{ color: "#9fa0a1", fontSize: 12, marginTop: 2 }}>
                    {ticket.status === "resolved"
                      ? "This issue has been marked as resolved. Reply below if the problem persists."
                      : "This ticket is closed. Open a new one if you need further help."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reply input (step 3 only) */}
        {step === 3 && ticket && ticket.status !== "closed" && (
          <div style={{
            padding: "12px 20px 20px",
            borderTop: "1px solid rgba(188,188,201,0.10)",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", gap: 8 }}>
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendReply()
                  }
                }}
                placeholder="Type a reply…"
                rows={2}
                style={{
                  flex: 1, background: "#12131a",
                  border: "1px solid rgba(188,188,201,0.15)",
                  borderRadius: 10, color: "#fff", fontSize: 13,
                  padding: "10px 12px", outline: "none",
                  resize: "none", fontFamily: "inherit",
                }}
              />
              <button
                disabled={sending || !reply.trim()}
                onClick={handleSendReply}
                style={{
                  background: reply.trim() ? "#6475D1" : "rgba(100,117,209,0.20)",
                  border: "none", borderRadius: 10, padding: "0 14px",
                  cursor: reply.trim() ? "pointer" : "not-allowed",
                  color: "#fff", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: sending || !reply.trim() ? 0.5 : 1,
                }}
              >
                {sending
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />}
              </button>
            </div>
            <p style={{ color: "#9fa0a1", fontSize: 10, marginTop: 6 }}>
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        )}
      </div>
    </>
  )
}
