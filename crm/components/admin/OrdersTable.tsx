"use client"
import { useState, useTransition, useCallback } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { StatusBadge } from "./StatusBadge"
import { updateOrderStatus, ordersExportUrl } from "@/lib/api/admin.client"
import type { Order, OrderStatus, OrdersPage } from "@/types/admin"
import { Download, ChevronLeft, ChevronRight, Search, MailCheck, MailX, MailWarning } from "lucide-react"
import { toast } from "react-toastify"

function EmailDot({ status }: { status?: "pending" | "sent" | "failed" }) {
  const s = status ?? "pending"
  const map = {
    sent:    { color: "#44d62c", Icon: MailCheck,   label: "Email sent" },
    failed:  { color: "#ef4444", Icon: MailX,       label: "Email failed — needs resend" },
    pending: { color: "#F59E0B", Icon: MailWarning, label: "Email pending" },
  }[s]
  return <map.Icon className="w-3.5 h-3.5" style={{ color: map.color }} aria-label={map.label} />
}

const PANEL: React.CSSProperties = {
  background: "rgba(28,30,42,0.70)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border: "1px solid rgba(188,188,201,0.15)",
  borderRadius: 10,
}

const INPUT_STYLE: React.CSSProperties = {
  background: "#1c1e2a",
  border: "1px solid rgba(188,188,201,0.15)",
  borderRadius: 10,
  color: "#fff",
  fontSize: 13,
  padding: "6px 10px",
  outline: "none",
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all",       label: "All statuses" },
  { value: "pending",   label: "Pending"      },
  { value: "paid",      label: "Paid"         },
  { value: "delivered", label: "Delivered"    },
  { value: "cancelled", label: "Cancelled"    },
  { value: "refunded",  label: "Refunded"     },
]

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

interface Props {
  initialData: OrdersPage
}

export function OrdersTable({ initialData }: Props) {
  const router     = useRouter()
  const pathname   = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [orders, setOrders] = useState<Order[]>(initialData.orders)
  const [total,  setTotal]  = useState(initialData.total)
  const [pages,  setPages]  = useState(initialData.pages)

  // Filter state — mirrors URL search params
  const page    = parseInt(searchParams.get("page")   || "1")
  const status  = searchParams.get("status")  || "all"
  const search  = searchParams.get("search")  || ""
  const from    = searchParams.get("from")    || ""
  const to      = searchParams.get("to")      || ""

  const [searchInput, setSearchInput] = useState(search)
  const [fromInput,   setFromInput]   = useState(from)
  const [toInput,     setToInput]     = useState(to)

  function pushParams(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(overrides).forEach(([k, v]) => {
      if (v && v !== "all") params.set(k, v)
      else params.delete(k)
    })
    params.set("page", "1")
    startTransition(() => router.push(`${pathname}?${params}`))
  }

  function handleStatusChange(val: string | null) {
    pushParams({ status: val ?? "all" })
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    pushParams({ search: searchInput, from: fromInput, to: toInput })
  }

  function handlePage(next: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(next))
    startTransition(() => router.push(`${pathname}?${params}`))
  }

  const handleStatusRowChange = useCallback(async (orderId: string, newStatus: OrderStatus) => {
    try {
      const updated = await updateOrderStatus(orderId, newStatus)
      // Merge full payload so emailStatus / keyAssignedAt from auto-fulfill propagate
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, ...updated } : o))
      toast.success(`Order status → ${updated.status}`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? "Failed to update order status"
      toast.error(msg)
    }
  }, [])

  const exportHref = ordersExportUrl({
    status: status !== "all" ? status : undefined,
    from:   from || undefined,
    to:     to   || undefined,
  })

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div style={PANEL} className="p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="flex-1 min-w-[160px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#9fa0a1" }} />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Email or ref…"
              style={{ ...INPUT_STYLE, paddingLeft: 30, width: "100%" }}
            />
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromInput}
              onChange={e => setFromInput(e.target.value)}
              style={INPUT_STYLE}
              title="From date"
            />
            <span style={{ color: "#9fa0a1", fontSize: 12 }}>–</span>
            <input
              type="date"
              value={toInput}
              onChange={e => setToInput(e.target.value)}
              style={INPUT_STYLE}
              title="To date"
            />
          </div>

          {/* Status filter */}
          <div style={{ minWidth: 150 }}>
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger style={{ ...INPUT_STYLE, height: 36, border: "1px solid rgba(188,188,201,0.15)" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "#1c1e2a", border: "1px solid rgba(188,188,201,0.15)", borderRadius: 10 }}>
                {STATUS_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value} style={{ color: "#fff", fontSize: 13 }}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <button type="submit" style={{
            background: "rgba(100,117,209,0.20)", color: "#6475D1",
            border: "1px solid rgba(100,117,209,0.30)", borderRadius: 10,
            padding: "6px 16px", fontSize: 13, cursor: "pointer",
          }}>
            Apply
          </button>

          {/* Export */}
          <a
            href={exportHref}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(68,214,44,0.12)", color: "#44d62c",
              border: "1px solid rgba(68,214,44,0.25)", borderRadius: 10,
              padding: "6px 14px", fontSize: 13, textDecoration: "none",
            }}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </a>
        </form>
      </div>

      {/* Table */}
      <div style={{ ...PANEL, overflow: "hidden" }}>
        {isPending && (
          <div style={{ height: 3, background: "#6475D1", borderRadius: 3, animation: "pulse 1s infinite" }} />
        )}

        <Table>
          <TableHeader>
            <TableRow style={{ borderColor: "rgba(188,188,201,0.10)" }}>
              {["Order ID", "Customer", "Items", "Total", "Status", "Email", "Date", "Update Status"].map(h => (
                <TableHead key={h} style={{ color: "#9fa0a1", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} style={{ textAlign: "center", color: "#9fa0a1", padding: "40px 0" }}>
                  No orders found.
                </TableCell>
              </TableRow>
            ) : (
              orders.map(o => (
                <TableRow
                  key={o._id}
                  style={{ borderColor: "rgba(188,188,201,0.08)", cursor: "pointer" }}
                  onClick={() => router.push(`/orders/${o._id}`)}
                >
                  <TableCell style={{ color: "#9fa0a1", fontSize: 12, fontFamily: "monospace" }}>
                    {o._id.slice(-8)}
                  </TableCell>
                  <TableCell style={{ color: "#fff", fontSize: 13 }}>{o.customerEmail}</TableCell>
                  <TableCell style={{ color: "#b3bade", fontSize: 13 }}>{o.items.length} item{o.items.length !== 1 ? "s" : ""}</TableCell>
                  <TableCell style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>
                    {currency.format(o.totalAmount)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={o.status} />
                  </TableCell>
                  <TableCell>
                    <EmailDot status={o.emailStatus} />
                  </TableCell>
                  <TableCell style={{ color: "#9fa0a1", fontSize: 12 }}>
                    {new Date(o.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Select
                      value={o.status}
                      onValueChange={val => { if (val) handleStatusRowChange(o._id, val as OrderStatus) }}
                    >
                      <SelectTrigger style={{ ...INPUT_STYLE, height: 30, fontSize: 12, minWidth: 120 }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent style={{ background: "#1c1e2a", border: "1px solid rgba(188,188,201,0.15)", borderRadius: 10 }}>
                        {STATUS_OPTIONS.slice(1).map(s => (
                          <SelectItem key={s.value} value={s.value} style={{ color: "#fff", fontSize: 12 }}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between p-4" style={{ borderTop: "1px solid rgba(188,188,201,0.10)" }}>
            <p style={{ fontSize: 12, color: "#9fa0a1" }}>
              {total} orders — page {page} of {pages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => handlePage(page - 1)}
                style={{
                  background: "rgba(188,188,201,0.08)", borderRadius: 8,
                  border: "1px solid rgba(188,188,201,0.15)", color: "#b3bade",
                  padding: "4px 10px", cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.4 : 1,
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= pages}
                onClick={() => handlePage(page + 1)}
                style={{
                  background: "rgba(188,188,201,0.08)", borderRadius: 8,
                  border: "1px solid rgba(188,188,201,0.15)", color: "#b3bade",
                  padding: "4px 10px", cursor: page >= pages ? "not-allowed" : "pointer", opacity: page >= pages ? 0.4 : 1,
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
