"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { fetchMyOrders } from "@/shared/services/shop"
import { fetchMyTickets, fetchOrderKey } from "@/features/friends/services/support"
import { useAuth } from "@/features/auth/state/AuthContext"
import type { Order } from "@/shared/types/admin"
import type { Ticket } from "@/shared/types/support"
import { SUBJECT_LABELS, STATUS_LABELS, STATUS_COLORS } from "@/shared/types/support"
import { StatusBadge } from "@/shared/components/StatusBadge"
import SupportDrawer from "@/components/support/SupportDrawer"
import {
  ShoppingBag, ChevronLeft, ChevronRight, Key, Copy, Check,
  MessageCircle, Receipt, Ticket as TicketIcon, Eye, EyeOff,
} from "lucide-react"
import { SectionHeading } from "@/shared/components/SectionHeading"
import { GlowCard }      from "@/shared/components/spotlight-card"
import { motion }        from "framer-motion"
import { searchGames }   from "@/features/products/services/games"
import { rawgImage }     from "@/lib/rawgImage"

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

const PANEL: React.CSSProperties = {
  background:           "rgba(28,30,42,0.70)",
  backdropFilter:       "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border:               "1px solid rgba(188,188,201,0.15)",
  borderRadius:         10,
}

// ── Key Reveal Cell ───────────────────────────────────────────────────────────
function KeyCell({ orderId }: { orderId: string }) {
  const [code,      setCode]      = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [shown,     setShown]     = useState(false)
  const [copied,    setCopied]    = useState(false)

  async function reveal() {
    if (code) { setShown(v => !v); return }
    setLoading(true)
    const k = await fetchOrderKey(orderId)
    setCode(k)
    setShown(true)
    setLoading(false)
  }

  async function copyCode() {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      // Fallback for HTTP (non-secure) environments
      const el = document.createElement("textarea")
      el.value = code
      el.style.position = "fixed"
      el.style.opacity = "0"
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, height: 28 }}>
      {shown && code ? (
        <>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(100,117,209,0.10)",
            borderRadius: 8, padding: "6px 12px",
          }}>
            <button
              onClick={() => setShown(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#44d62c", padding: 0, flexShrink: 0 }}
              title="Hide key"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
            <code style={{
              color: "#44d62c", fontSize: 13, fontWeight: 700, letterSpacing: "0.06em",
              textShadow: "0 0 10px rgba(68,214,44,0.6), 0 0 20px rgba(68,214,44,0.3)",
            }}>
              {code}
            </code>
          </div>
          <button
            onClick={copyCode}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0, color: copied ? "#44d62c" : "#9fa0a1" }}
            title="Copy key"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </>
      ) : (
        /* Eye icon + label share the same background button */
        <button
          onClick={reveal}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(100,117,209,0.10)",
            border: "none", borderRadius: 8, padding: "6px 12px",
            cursor: loading ? "wait" : "pointer",
            color: "#6475D1", fontSize: 12, fontWeight: 600,
          }}
        >
          <Eye className="w-3.5 h-3.5" />
          {loading ? "Loading…" : "View Key"}
        </button>
      )}
    </div>
  )
}

// ── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({
  order, onGetHelp,
}: {
  order: Order
  onGetHelp: (order: Order) => void
}) {
  const [cover, setCover] = useState<string | null>(null)

  useEffect(() => {
    const name = order.items[0]?.productName
    if (!name) return
    searchGames(name, 1)
      .then(results => { if (results[0]?.cover) setCover(results[0].cover) })
      .catch(() => {})
  }, [order.items])

  return (
    <div style={{ ...PANEL, padding: "16px 18px" }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {/* Cover + info */}
        <div style={{ display: "flex", gap: 12, flex: 1, minWidth: 0 }}>
          {/* Game cover */}
          <div style={{
            width: 207, height: 117, borderRadius: 10, flexShrink: 0,
            background: "rgba(100,117,209,0.10)",
            border: "1px solid rgba(100,117,209,0.15)",
            overflow: "hidden",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {cover ? (
              <img
                src={rawgImage(cover)}
                alt={order.items[0]?.productName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <Receipt className="w-6 h-6" style={{ color: "rgba(100,117,209,0.35)" }} />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: "#9fa0a1", fontSize: 11, marginBottom: 4 }}>
              #{order._id.slice(-10).toUpperCase()} · {new Date(order.createdAt).toLocaleDateString()}
            </p>
            <p style={{
              color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 4,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {order.items[0]?.productName ?? "Order"}
              {order.items.length > 1 && (
                <span style={{ color: "#9fa0a1", fontWeight: 400 }}>
                  {" "}+{order.items.length - 1} more
                </span>
              )}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StatusBadge status={order.status} />
              <span style={{ color: "#9fa0a1", fontSize: 12 }}>·</span>
              <span style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>
                {currency.format(order.totalAmount)}
              </span>
            </div>
            {order.status === "delivered" && <KeyCell orderId={order._id} />}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => onGetHelp(order)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "rgba(188,188,201,0.06)",
              border: "1px solid rgba(188,188,201,0.12)",
              borderRadius: 8, padding: "6px 12px", cursor: "pointer",
              color: "#9fa0a1", fontSize: 12, fontWeight: 600,
            }}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Get Help
          </button>
        </div>
      </div>

    </div>
  )
}

// ── Ticket Card ───────────────────────────────────────────────────────────────
function TicketCard({ ticket, onClick }: { ticket: Ticket; onClick: () => void }) {
  const last = ticket.messages[ticket.messages.length - 1]
  return (
    <button
      onClick={onClick}
      style={{
        ...PANEL, padding: "14px 18px", width: "100%", textAlign: "left",
        cursor: "pointer", display: "block",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: "#9fa0a1", fontSize: 11, marginBottom: 4 }}>
            #{ticket.orderRef} · {SUBJECT_LABELS[ticket.subject]}
          </p>
          <p style={{
            color: "#fff", fontSize: 13, fontWeight: 600, marginBottom: 6,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {ticket.productName}
          </p>
          {last && (
            <p style={{
              color: "#9fa0a1", fontSize: 12,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {last.senderRole === "admin" ? "Support: " : "You: "}
              {last.body}
            </p>
          )}
        </div>
        <div style={{ flexShrink: 0, textAlign: "right" }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "3px 8px",
            borderRadius: 999, background: `${STATUS_COLORS[ticket.status]}22`,
            color: STATUS_COLORS[ticket.status],
            border: `1px solid ${STATUS_COLORS[ticket.status]}44`,
            display: "inline-block", marginBottom: 6,
          }}>
            {STATUS_LABELS[ticket.status]}
          </span>
          <p style={{ color: "#9fa0a1", fontSize: 11 }}>
            {new Date(ticket.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </button>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MyOrdersPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  // Tab state
  const [tab, setTab]         = useState<"orders" | "tickets">("orders")
  const [hoveredTab, setHoveredTab] = useState<"orders" | "tickets" | null>(null)

  // Orders state
  const [orders,        setOrders]        = useState<Order[]>([])
  const [ordersTotal,   setOrdersTotal]   = useState(0)
  const [ordersPages,   setOrdersPages]   = useState(1)
  const [ordersPage,    setOrdersPage]    = useState(1)
  const [ordersLoading, setOrdersLoading] = useState(true)

  // Tickets state
  const [tickets,        setTickets]        = useState<Ticket[]>([])
  const [ticketsTotal,   setTicketsTotal]   = useState(0)
  const [ticketsPages,   setTicketsPages]   = useState(1)
  const [ticketsPage,    setTicketsPage]    = useState(1)
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [ticketsLoaded,  setTicketsLoaded]  = useState(false)

  // Support drawer state
  const [drawerOpen,        setDrawerOpen]        = useState(false)
  const [selectedOrder,     setSelectedOrder]     = useState<Order | null>(null)
  const [selectedTicket,    setSelectedTicket]    = useState<Ticket | null>(null)

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?from=/account/orders")
    }
  }, [user, authLoading, router])

  // ── Load orders ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading || !user) return
    setOrdersLoading(true)
    fetchMyOrders(ordersPage)
      .then(data => {
        setOrders(data.orders)
        setOrdersTotal(data.total)
        setOrdersPages(data.pages)
      })
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false))
  }, [user, authLoading, ordersPage])

  // ── Load tickets (lazy — only when tab opens) ────────────────────────────────
  const loadTickets = useCallback(async (page: number) => {
    setTicketsLoading(true)
    try {
      const data = await fetchMyTickets(page)
      setTickets(data.tickets)
      setTicketsTotal(data.total)
      setTicketsPages(data.pages)
      setTicketsLoaded(true)
    } catch {
      setTickets([])
    } finally {
      setTicketsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === "tickets" && user && !authLoading) {
      loadTickets(ticketsPage)
    }
  }, [tab, user, authLoading, ticketsPage, loadTickets])

  // ── Open support drawer for an order ────────────────────────────────────────
  function openSupportForOrder(order: Order) {
    setSelectedOrder(order)
    setSelectedTicket(null)
    setDrawerOpen(true)
  }

  // ── Open support drawer for an existing ticket ───────────────────────────────
  function openTicket(ticket: Ticket) {
    // We need the corresponding order for the drawer
    const order = orders.find(o => o._id === ticket.orderId) ?? {
      _id: ticket.orderId, items: [{ productName: ticket.productName }],
    } as unknown as Order
    setSelectedOrder(order)
    setSelectedTicket(ticket)
    setDrawerOpen(true)
  }

  function handleDrawerClose() {
    setDrawerOpen(false)
    // Refresh tickets if we were on that tab (new ticket may have been created)
    if (tab === "tickets") loadTickets(ticketsPage)
    else setTicketsLoaded(false) // invalidate so it reloads next time
  }

  return (
    // Shell (sidebar + background) provided by (app)/layout.tsx
    <>
      <div
        style={{
          width:        "min(calc(100% - 192px), 1600px)",
          marginInline: "auto",
          paddingBlock: 40,
          color:        "#fff",
        }}
      >
        <SectionHeading
          title="Purchase History"
          right={
            ordersTotal > 0 ? (
              <span style={{ color: "#9fa0a1", fontSize: 13 }}>
                {ordersTotal} order{ordersTotal !== 1 ? "s" : ""}
              </span>
            ) : undefined
          }
        />

        {/* Tabs */}
        {(() => {
          const focusedTab = hoveredTab ?? tab
          const glowBase   = focusedTab === "orders" ? "120" : "220"
          const pinnedXp   = focusedTab === "orders" ? 0.25 : 0.75
          return (
            <GlowCard
              customSize
              glowColor={focusedTab === "orders" ? "green" : "blue"}
              pinned={{ xp: pinnedXp, yp: 0.5 }}
              className="!rounded-[12px] !p-1 !aspect-auto !backdrop-blur-none !shadow-none mb-5 flex gap-1"
              style={{
                width:      "100%",
                background: "rgba(28,30,42,0.40)",
                border:     "1px solid rgba(31,37,57,0.6)",
                ["--base"   as any]: glowBase,
                ["--spread" as any]: "0",
                ["--size"   as any]: "500",
              }}
            >
              {([
                { key: "orders",  label: "Orders",  Icon: Receipt,    color: "#44D62C" },
                { key: "tickets", label: "Support", Icon: TicketIcon, color: "#6475D1" },
              ] as const).map(({ key, label, Icon, color }) => {
                const isActive  = tab === key
                const isHovered = hoveredTab === key
                return (
                  <motion.button
                    key={key}
                    onClick={() => setTab(key)}
                    onMouseEnter={() => setHoveredTab(key)}
                    onMouseLeave={() => setHoveredTab(null)}
                    whileTap={{ scale: 0.96 }}
                    className="flex-1 relative z-10 after:absolute after:inset-[-60px] after:content-['']"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                      borderRadius: 9, padding: "8px 0",
                      fontSize: 18, fontWeight: isActive ? 700 : 500,
                      color:      isActive || isHovered ? color : "rgba(255,255,255,0.4)",
                      background: "transparent",
                      border:     "1px solid transparent",
                      cursor:     "pointer",
                      transition: "all 0.25s",
                    }}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                    {label}
                  </motion.button>
                )
              })}
            </GlowCard>
          )
        })()}

        {/* ── Orders Tab ── */}
        {tab === "orders" && (
          <>
            {ordersLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{
                    height: 145, borderRadius: 10,
                    background: "rgba(28,30,42,0.50)",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }} />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div style={{ ...PANEL, padding: "60px 32px", textAlign: "center" }}>
                <ShoppingBag className="w-12 h-12 mx-auto mb-4" style={{ color: "rgba(100,117,209,0.40)" }} />
                <p style={{ color: "#fff", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No orders yet</p>
                <p style={{ color: "#9fa0a1", fontSize: 13, marginBottom: 24 }}>
                  Head to a game page to buy your first key.
                </p>
                <button
                  onClick={() => router.push("/")}
                  style={{
                    background: "#6475D1", color: "#fff", border: "none",
                    borderRadius: 10, padding: "10px 24px", fontSize: 14,
                    fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Browse Games
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {orders.map(order => (
                  <OrderCard key={order._id} order={order} onGetHelp={openSupportForOrder} />
                ))}

                {ordersPages > 1 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, paddingTop: 8 }}>
                    <button
                      disabled={ordersPage <= 1}
                      onClick={() => setOrdersPage(p => p - 1)}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        background: "rgba(188,188,201,0.08)", color: "#b3bade",
                        border: "1px solid rgba(188,188,201,0.15)", borderRadius: 10,
                        padding: "7px 14px", fontSize: 13,
                        cursor: ordersPage <= 1 ? "not-allowed" : "pointer",
                        opacity: ordersPage <= 1 ? 0.4 : 1,
                      }}
                    >
                      <ChevronLeft className="w-4 h-4" /> Prev
                    </button>
                    <span style={{ color: "#9fa0a1", fontSize: 13 }}>
                      {ordersPage} / {ordersPages}
                    </span>
                    <button
                      disabled={ordersPage >= ordersPages}
                      onClick={() => setOrdersPage(p => p + 1)}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        background: "rgba(188,188,201,0.08)", color: "#b3bade",
                        border: "1px solid rgba(188,188,201,0.15)", borderRadius: 10,
                        padding: "7px 14px", fontSize: 13,
                        cursor: ordersPage >= ordersPages ? "not-allowed" : "pointer",
                        opacity: ordersPage >= ordersPages ? 0.4 : 1,
                      }}
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Tickets Tab ── */}
        {tab === "tickets" && (
          <>
            {ticketsLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{
                    height: 88, borderRadius: 10,
                    background: "rgba(28,30,42,0.50)",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }} />
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <div style={{ ...PANEL, padding: "60px 32px", textAlign: "center" }}>
                <MessageCircle className="w-12 h-12 mx-auto mb-4" style={{ color: "rgba(100,117,209,0.40)" }} />
                <p style={{ color: "#fff", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No support tickets</p>
                <p style={{ color: "#9fa0a1", fontSize: 13, marginBottom: 24 }}>
                  If you have an issue with an order, click "Get Help" on any order.
                </p>
                <button
                  onClick={() => setTab("orders")}
                  style={{
                    background: "rgba(100,117,209,0.15)", color: "#6475D1",
                    border: "1px solid rgba(100,117,209,0.25)", borderRadius: 10,
                    padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  View Orders
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {tickets.map(ticket => (
                  <TicketCard key={ticket._id} ticket={ticket} onClick={() => openTicket(ticket)} />
                ))}

                {ticketsPages > 1 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, paddingTop: 8 }}>
                    <button
                      disabled={ticketsPage <= 1}
                      onClick={() => setTicketsPage(p => p - 1)}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        background: "rgba(188,188,201,0.08)", color: "#b3bade",
                        border: "1px solid rgba(188,188,201,0.15)", borderRadius: 10,
                        padding: "7px 14px", fontSize: 13,
                        cursor: ticketsPage <= 1 ? "not-allowed" : "pointer",
                        opacity: ticketsPage <= 1 ? 0.4 : 1,
                      }}
                    >
                      <ChevronLeft className="w-4 h-4" /> Prev
                    </button>
                    <span style={{ color: "#9fa0a1", fontSize: 13 }}>
                      {ticketsPage} / {ticketsPages}
                    </span>
                    <button
                      disabled={ticketsPage >= ticketsPages}
                      onClick={() => setTicketsPage(p => p + 1)}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        background: "rgba(188,188,201,0.08)", color: "#b3bade",
                        border: "1px solid rgba(188,188,201,0.15)", borderRadius: 10,
                        padding: "7px 14px", fontSize: 13,
                        cursor: ticketsPage >= ticketsPages ? "not-allowed" : "pointer",
                        opacity: ticketsPage >= ticketsPages ? 0.4 : 1,
                      }}
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Support drawer */}
      <SupportDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        orderId={selectedOrder?._id ?? ""}
        productName={selectedOrder?.items[0]?.productName ?? ""}
        ticket={selectedTicket}
      />
    </>
  )
}
