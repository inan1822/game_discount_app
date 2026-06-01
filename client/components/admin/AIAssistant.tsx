"use client"

/**
 * AIAssistant — sliding right-panel chat drawer for the DisLow admin panel.
 *
 * Three contexts:
 *   • Game Links  — paste a store URL, Claude auto-fills all fields
 *   • Products    — ask Claude to pre-fill a product listing
 *   • Analytics   — get revenue-optimisation advice
 *
 * Design: DisLow glass panel tokens (rgba(28,30,42,0.95) + blur), blue (#6475D1) accent.
 * Streaming: native fetch SSE — real-time text deltas, tool-call indicators.
 * Security: text-only input; URL safety enforced server-side.
 */

import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles, X, Send, Loader2, Link2, Package, BarChart2,
  ChevronRight, RotateCcw, Copy, Check,
} from "lucide-react"
import { streamAdminChat, analyzeStoreLink, type LLMContext, type LLMEvent } from "@/shared/services/adminLLM"
import { toast } from "react-toastify"

// ─── Types ────────────────────────────────────────────────────────────────────

type Role    = "user" | "assistant"
type MsgKind = "text" | "tool_call" | "error"

interface LinkData {
  rawgId:           number | null
  rawgName:         string | null
  label:            string
  platform:         string
  price:            number | null
  storeIcon:        string
  subscriptionName: string | null
  discountExpiresAt: string | null
  note:             string
  url:              string
}

interface Message {
  id:        string
  role:      Role
  kind:      MsgKind
  text:      string
  toolName?: string
  linkData?: LinkData   // set when AI successfully analyzed a store URL
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const PANEL: React.CSSProperties = {
  background:           "rgba(18,19,26,0.97)",
  backdropFilter:       "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  borderLeft:           "1px solid rgba(31,37,57,0.9)",
}

const GLASS_CARD: React.CSSProperties = {
  background:   "rgba(28,30,42,0.80)",
  border:       "1px solid rgba(31,37,57,0.8)",
  borderRadius: 10,
}

const INPUT_STYLE: React.CSSProperties = {
  background:   "#1c1e2a",
  border:       "1px solid rgba(188,188,201,0.18)",
  borderRadius: 10,
  color:        "#fff",
  fontSize:     13,
  outline:      "none",
  resize:       "none",
}

const ACCENT = "#6475D1"

// ─── Context config ───────────────────────────────────────────────────────────

const CONTEXTS: {
  key:         LLMContext
  label:       string
  icon:        React.ElementType
  placeholder: string
  tip:         string
}[] = [
  {
    key:   "game-links",
    label: "Game Links",
    icon:  Link2,
    placeholder: "Paste a store URL or describe what you need…\ne.g. https://store.steampowered.com/app/1174180/",
    tip:   "Paste any game store URL and I'll auto-fill all fields for you.",
  },
  {
    key:   "products",
    label: "Products",
    icon:  Package,
    placeholder: 'Tell me the game name and I\'ll pre-fill the product form…\ne.g. "GTA V PC game key"',
    tip:   "Give me a game name or product type and I'll suggest name, price, platform, and category.",
  },
  {
    key:   "analytics",
    label: "Analytics",
    icon:  BarChart2,
    placeholder: 'Ask for revenue advice, pricing ideas, or trend analysis…\ne.g. "What products should I feature this week?"',
    tip:   "I'll pull your live store stats and give you specific, data-backed recommendations.",
  },
]

// ─── Quick prompts per context ─────────────────────────────────────────────────

const QUICK_PROMPTS: Record<LLMContext, string[]> = {
  "game-links": [
    "Analyze https://store.steampowered.com/app/1172470/ and suggest a link",
    "Check if this URL has a limited-time deal",
    "What subscription services include GTA V right now?",
  ],
  "products": [
    "Create a listing for Elden Ring on PC",
    "Suggest a PS5 gift card product at $50",
    "What DLC packs sell best for action RPGs?",
  ],
  "analytics": [
    "What products should I feature this week?",
    "How can I increase average order value?",
    "Which platforms have the most untapped demand?",
  ],
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2) }

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      title="Copy"
      style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "#9fa0a1" }}
    >
      {copied ? <Check size={12} color="#44d62c" /> : <Copy size={12} />}
    </button>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user"

  if (msg.kind === "tool_call") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0" }}>
        <Loader2 size={13} color={ACCENT} className="animate-spin" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: "#9fa0a1", fontStyle: "italic" }}>
          Using tool: <strong style={{ color: "#b3bade" }}>{msg.toolName}</strong>…
        </span>
      </div>
    )
  }

  if (msg.kind === "error") {
    return (
      <div style={{
        ...GLASS_CARD,
        padding: "10px 14px",
        margin: "6px 0",
        borderColor: "rgba(239,68,68,0.35)",
        background: "rgba(239,68,68,0.08)",
      }}>
        <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>{msg.text}</p>
      </div>
    )
  }

  return (
    <div style={{
      display:  "flex",
      flexDirection: "column",
      alignItems: isUser ? "flex-end" : "flex-start",
      margin: "6px 0",
    }}>
      <div style={{
        ...GLASS_CARD,
        padding:    "10px 14px",
        maxWidth:   "88%",
        background: isUser
          ? `rgba(100,117,209,0.18)`
          : "rgba(28,30,42,0.85)",
        borderColor: isUser
          ? "rgba(100,117,209,0.35)"
          : "rgba(31,37,57,0.8)",
      }}>
        {/* Pre-formatted so JSON/code blocks render nicely */}
        <pre style={{
          margin:      0,
          fontFamily:  "inherit",
          fontSize:    13,
          lineHeight:  1.6,
          color:       "#e2e8f0",
          whiteSpace:  "pre-wrap",
          wordBreak:   "break-word",
        }}>
          {msg.text}
        </pre>
      </div>
      <div style={{ marginTop: 4, paddingLeft: 2, display: "flex", gap: 8, alignItems: "center" }}>
        {!isUser && msg.text.length > 60 && <CopyButton text={msg.text} />}
        {msg.linkData && (
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent("dislow:fill-game-link", { detail: msg.linkData }))
              toast.success("Form opened and pre-filled ✓")
            }}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "rgba(68,214,44,0.15)", border: "1px solid rgba(68,214,44,0.35)",
              borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700,
              color: "#44d62c", cursor: "pointer",
            }}
          >
            📋 Fill Form
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AIAssistant() {
  const [open,     setOpen]     = useState(false)
  const [mounted,  setMounted]  = useState(false)

  // Portal requires document — only available after first client render
  useEffect(() => { setMounted(true) }, [])
  const [context,  setContext]  = useState<LLMContext>("game-links")
  const [input,    setInput]    = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [loading,  setLoading]  = useState(false)
  // Conversation history (parallel array for the API, separate from display messages)
  const historyRef = useRef<{ role: string; content: unknown }[]>([])
  const abortRef   = useRef<AbortController | null>(null)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const textareaRef= useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom whenever messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Focus textarea when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 200)
    }
  }, [open])

  // Reset conversation when context tab changes
  const switchContext = (ctx: LLMContext) => {
    if (ctx === context) return
    setContext(ctx)
    setMessages([])
    historyRef.current = []
    setInput("")
  }

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setInput("")
    setLoading(true)

    // ── Game-links context + URL anywhere in message → analyze endpoint ────────
    const urlMatch = trimmed.match(/https?:\/\/[^\s]+/i)
    if (context === "game-links" && urlMatch) {
      const extractedUrl = urlMatch[0].replace(/[.,;)]+$/, "") // strip trailing punctuation
      const userMsg: Message = { id: uid(), role: "user", kind: "text", text: trimmed }
      const aiId = uid()
      const thinkingMsg: Message = { id: uid(), role: "assistant", kind: "tool_call", text: "", toolName: "fetch_url_content" }
      setMessages(prev => [...prev, userMsg, thinkingMsg])

      try {
        const data = await analyzeStoreLink(extractedUrl)
        const linkData: LinkData = { ...data, url: extractedUrl }
        const aiMsg: Message = {
          id: aiId, role: "assistant", kind: "text",
          text: `✅ Got it! Here's what I found:\n\n**${data.label}**\nGame: ${data.rawgName ?? "—"} (RAWG #${data.rawgId ?? "?"})\nPlatform: ${data.platform} · Price: ${data.price != null ? `$${data.price}` : "check manually"}\n${data.subscriptionName ? `Subscription: ${data.subscriptionName}\n` : ""}${data.discountExpiresAt ? `Expires: ${data.discountExpiresAt}\n` : ""}\nClick **Fill Form** to auto-populate all fields instantly.`,
          linkData,
        }
        setMessages(prev => prev.filter(m => m.id !== thinkingMsg.id).concat(aiMsg))
      } catch (err) {
        const errMsg: Message = { id: aiId, role: "assistant", kind: "error", text: (err as Error).message }
        setMessages(prev => prev.filter(m => m.id !== thinkingMsg.id).concat(errMsg))
      } finally {
        setLoading(false)
      }
      return
    }

    // ── General chat path ──────────────────────────────────────────────────────
    // Add user message to display
    const userMsg: Message = { id: uid(), role: "user", kind: "text", text: trimmed }
    setMessages(prev => [...prev, userMsg])

    // Add user message to history
    historyRef.current = [...historyRef.current, { role: "user", content: trimmed }]

    // Streaming AI message — starts empty, built up by deltas
    const aiId  = uid()
    const aiMsg: Message = { id: aiId, role: "assistant", kind: "text", text: "" }
    setMessages(prev => [...prev, aiMsg])

    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      await streamAdminChat({
        message:  trimmed,
        context,
        history:  historyRef.current.slice(0, -1), // exclude the one we just added (sent separately)
        signal:   ctrl.signal,
        onEvent:  (event: LLMEvent) => {
          if (event.type === "delta" && event.text) {
            setMessages(prev => prev.map(m =>
              m.id === aiId ? { ...m, text: m.text + event.text! } : m
            ))
          }
          if (event.type === "tool_call" && event.name) {
            const toolMsg: Message = { id: uid(), role: "assistant", kind: "tool_call", text: "", toolName: event.name }
            setMessages(prev => [...prev, toolMsg])
          }
          if (event.type === "done" && event.history) {
            historyRef.current = event.history as { role: string; content: unknown }[]
            // Remove all "Using tool…" spinner messages — they served their purpose
            setMessages(prev => prev.filter(m => m.kind !== "tool_call"))
          }
          if (event.type === "error") {
            setMessages(prev => prev.map(m =>
              m.id === aiId ? { ...m, kind: "error", text: event.message ?? "Unknown error" } : m
            ))
          }
        },
      })
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setMessages(prev => prev.filter(m => m.id !== aiId))
      } else {
        toast.error("AI request failed — check console")
        setMessages(prev => prev.map(m =>
          m.id === aiId ? { ...m, kind: "error", text: String(err) } : m
        ))
      }
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }, [context, loading])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const clearConversation = () => {
    setMessages([])
    historyRef.current = []
    setInput("")
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null }
    setLoading(false)
  }

  const ctx = CONTEXTS.find(c => c.key === context)!

  return (
    <>
      {/* ── Trigger button — sits in the sidebar, wired from AdminSidebar ── */}
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        title="AI Assistant (Claude)"
        style={{
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          gap:             8,
          width:           "calc(100% - 24px)",
          margin:          "0 12px 16px",
          borderRadius:    10,
          padding:         "10px 16px",
          background:      open
            ? `rgba(100,117,209,0.25)`
            : `rgba(100,117,209,0.12)`,
          border:          `1px solid rgba(100,117,209,${open ? 0.55 : 0.25})`,
          color:           ACCENT,
          fontSize:        13,
          fontWeight:      700,
          cursor:          "pointer",
          boxShadow:       open ? `0 0 16px rgba(100,117,209,0.25)` : "none",
          transition:      "all 0.2s",
        }}
      >
        <Sparkles size={15} />
        AI Assistant
      </motion.button>

      {/* ── Drawer — rendered via portal so it escapes the sidebar's CSS transform
              context and positions correctly against the real viewport ── */}
      {mounted && createPortal(
        <AnimatePresence>
          {open && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
                style={{
                  position: "fixed", inset: 0, zIndex: 9998,
                  background: "rgba(0,0,0,0.35)",
                  backdropFilter: "blur(2px)",
                }}
              />

              {/* Panel */}
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 340, damping: 30 }}
                style={{
                  position: "fixed",
                  right: 0, top: 0, bottom: 0,
                  width: 440,
                  zIndex: 9999,
                  display: "flex",
                  flexDirection: "column",
                  ...PANEL,
                }}
              >
              {/* ── Header ── */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "18px 20px 14px",
                borderBottom: "1px solid rgba(31,37,57,0.9)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: `rgba(100,117,209,0.18)`,
                    border: `1px solid rgba(100,117,209,0.35)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Sparkles size={15} color={ACCENT} />
                  </div>
                  <div>
                    <p style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: 0 }}>Admin AI</p>
                    <p style={{ color: "#9fa0a1", fontSize: 11, margin: 0 }}>Powered by Claude Sonnet 4.6</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {messages.length > 0 && (
                    <button onClick={clearConversation} title="New conversation"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#9fa0a1", padding: "4px 6px", borderRadius: 6 }}>
                      <RotateCcw size={15} />
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} title="Close"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#9fa0a1", padding: "4px 6px", borderRadius: 6 }}>
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* ── Context tabs ── */}
              <div style={{
                display: "flex", gap: 4, padding: "10px 14px",
                borderBottom: "1px solid rgba(31,37,57,0.7)",
              }}>
                {CONTEXTS.map(c => {
                  const Icon = c.icon
                  const active = c.key === context
                  return (
                    <button key={c.key} onClick={() => switchContext(c.key)}
                      style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                        gap: 5, padding: "7px 4px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                        cursor: "pointer",
                        background: active ? `rgba(100,117,209,0.18)` : "transparent",
                        border:     active ? `1px solid rgba(100,117,209,0.40)` : "1px solid transparent",
                        color:      active ? ACCENT : "#9fa0a1",
                        transition: "all 0.18s",
                      }}
                    >
                      <Icon size={13} />
                      {c.label}
                    </button>
                  )
                })}
              </div>

              {/* ── Messages ── */}
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", scrollbarWidth: "none" }}>

                {/* Welcome / tip when no messages */}
                {messages.length === 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{
                      ...GLASS_CARD,
                      padding: "14px 16px",
                      marginBottom: 14,
                      background: "rgba(100,117,209,0.07)",
                      borderColor: "rgba(100,117,209,0.22)",
                    }}>
                      <p style={{ fontSize: 13, color: "#b3bade", margin: "0 0 4px" }}>
                        <strong style={{ color: "#fff" }}>{ctx.icon && <ctx.icon size={13} style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }} />}{ctx.label} mode</strong>
                      </p>
                      <p style={{ fontSize: 12, color: "#9fa0a1", margin: 0, lineHeight: 1.6 }}>
                        {ctx.tip}
                      </p>
                    </div>

                    {/* Quick prompts */}
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#9fa0a1", marginBottom: 8 }}>QUICK PROMPTS</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {QUICK_PROMPTS[context].map(prompt => (
                        <button key={prompt} onClick={() => send(prompt)}
                          style={{
                            ...GLASS_CARD,
                            padding: "9px 12px",
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            cursor: "pointer", textAlign: "left",
                            background: "rgba(28,30,42,0.6)",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(100,117,209,0.10)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "rgba(28,30,42,0.6)")}
                        >
                          <span style={{ fontSize: 12, color: "#b3bade" }}>{prompt}</span>
                          <ChevronRight size={13} color="#9fa0a1" style={{ flexShrink: 0 }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map(msg => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
                <div ref={bottomRef} />
              </div>

              {/* ── Input area ── */}
              <div style={{
                padding: "12px 16px 16px",
                borderTop: "1px solid rgba(31,37,57,0.9)",
              }}>
                {/* Security note */}
                <p style={{ fontSize: 10, color: "#9fa0a1", marginBottom: 8, letterSpacing: "0.04em" }}>
                  Text-only · URLs must be known game stores · Admin-only
                </p>

                <div style={{ display: "flex", gap: 8 }}>
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={ctx.placeholder}
                    rows={3}
                    style={{
                      ...INPUT_STYLE,
                      flex: 1,
                      padding: "10px 12px",
                      lineHeight: 1.5,
                    }}
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <motion.button
                      onClick={() => send(input)}
                      disabled={!input.trim() || loading}
                      whileHover={!input.trim() || loading ? undefined : { scale: 1.05 }}
                      whileTap={!input.trim() || loading ? undefined : { scale: 0.95 }}
                      style={{
                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                        background:  !input.trim() || loading ? "rgba(100,117,209,0.12)" : ACCENT,
                        border:      "none",
                        cursor:      !input.trim() || loading ? "not-allowed" : "pointer",
                        display:     "flex", alignItems: "center", justifyContent: "center",
                        color:       "#fff",
                        opacity:     !input.trim() || loading ? 0.45 : 1,
                        transition:  "all 0.18s",
                        boxShadow:   !input.trim() || loading ? "none" : "0 2px 12px rgba(100,117,209,0.35)",
                      }}
                    >
                      {loading
                        ? <Loader2 size={16} className="animate-spin" />
                        : <Send size={16} />}
                    </motion.button>
                    {loading && (
                      <button
                        onClick={() => { abortRef.current?.abort(); setLoading(false) }}
                        title="Stop"
                        style={{
                          width: 40, height: 28, borderRadius: 8,
                          background: "rgba(239,68,68,0.12)",
                          border: "1px solid rgba(239,68,68,0.25)",
                          color: "#ef4444", fontSize: 10, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <p style={{ fontSize: 10, color: "#9fa0a1", marginTop: 6 }}>
                  Enter to send · Shift+Enter for newline
                </p>
              </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
