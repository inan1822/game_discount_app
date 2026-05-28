"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { fetchMyOrders } from "@/lib/api/shop"
import { fetchMyTickets, fetchOrderKey } from "@/lib/api/support"
import { useAuth } from "@/context/AuthContext"
import type { Order } from "@/types/admin"
import type { Ticket } from "@/types/support"
import { SUBJECT_LABELS, STATUS_LABELS, STATUS_COLORS } from "@/types/support"
import { StatusBadge } from "@/components/admin/StatusBadge"
import SupportDrawer from "@/components/support/SupportDrawer"
import {
  ShoppingBag, ChevronLeft, ChevronRight, Key, Copy, Check,
  MessageCircle, Receipt, Ticket as TicketIcon, Eye, EyeOff,
} from "lucide-react"

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
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ marginTop: 10 }}>
      {shown && code ? (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(68,214,44,0.06)",
          border: "1px solid rgba(68,214,44,0.20)",
          borderRadius: 8, padding: "8px 12px",
        }}>
          <Key className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#44d62c" }} />
          <code style={{ color: "#44d62c", fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", flex: 1 }}>
            {code}
          </code>
          <button
            onClick={copyCode}
            style={{
              background: copied ? "rgba(68,214,44,0.15)" : "rgba(188,188,201,0.08)",
              border: "none", borderRadius: 6, cursor: "pointer",
              color: copied ? "#44d62c" : "#9fa0a1",
              padding: "4px 8px", fontSize: 11, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 3, flexShrink: 0,
            }}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={() => setShown(false)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#9fa0a1", padding: 2,
            }}
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={reveal}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(100,117,209,0.10)",
            border: "1px solid rgba(100,117,209,0.20)",
            borderRadius: 8, padding: "6px 12px", cursor: loading ? "wait" : "pointer",
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
  return (
    <div style={{ ...PANEL, padding: "16px 18px" }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {/* Cover + info */}
        <div style={{ display: "flex", gap: 12, flex: 1, minWidth: 0 }}>
          {/* Image placeholder (game cover from product) */}
          <div style={{
            width: 52, height: 52, borderRadius: 8, flexShrink: 0,
            background: "rgba(100,117,209,0.12)",
            border: "1px solid rgba(100,117,209,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Receipt className="w-5 h-5" style={{ color: "rgba(100,117,209,0.40)" }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: "#9fa0a1", fontSize: 11, marginBottom: 4 }}>
              #{order._id.slice(-10).toUpperCase()} · {new Date(order.createdAt).toLocaleDateString()}
            </p>
            <p style={{
              color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 4,
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
              <span style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>
                {currency.format(order.totalAmount)}
              </span>
            </div>
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

      {/* Key reveal — only for delivered orders */}
      {order.status === "delivered" && <KeyCell orderId={order._id} />}
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
  const [tab, setTab] = useState<"orders" | "tickets">("orders")

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
      <div className="flex-1 min-w-0 overflow-y-auto px-4 py-10" style={{ scrollbarWidth: "none", color: "#fff" }}>
        <div className="max-w-3xl mx-auto">

        {/* Header */}
        <header style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>Purchase History</h1>
          <p style={{ color: "#9fa0a1", fontSize: 13, marginTop: 6 }}>
            {ordersTotal > 0 ? `${ordersTotal} order${ordersTotal !== 1 ? "s" : ""}` : "Your purchase history"}
          </p>
        </header>

        {/* Tabs */}
        <div style={{
          display: "flex", gap: 6,
          background: "rgba(28,30,42,0.50)",
          border: "1px solid rgba(188,188,201,0.10)",
          borderRadius: 10, padding: 4, marginBottom: 20,
        }}>
          {([
            { key: "orders",  label: "Orders",  Icon: Receipt    },
            { key: "tickets", label: "Support", Icon: TicketIcon },
          ] as const).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                background: tab === key ? "rgba(100,117,209,0.20)" : "transparent",
                border: tab === key ? "1px solid rgba(100,117,209,0.30)" : "1px solid transparent",
                borderRadius: 8, padding: "9px 0", cursor: "pointer",
                color: tab === key ? "#6475D1" : "#9fa0a1",
                fontSize: 13, fontWeight: tab === key ? 700 : 400,
                transition: "all 0.15s",
              }}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Orders Tab ── */}
        {tab === "orders" && (
          <>
            {ordersLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{
                    height: 96, borderRadius: 10,
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
