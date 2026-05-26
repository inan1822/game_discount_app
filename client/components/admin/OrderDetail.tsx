"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { StatusBadge } from "./StatusBadge"
import { updateOrderStatus, resendDeliveryEmail } from "@/lib/api/admin.client"
import type { Order, OrderStatus, EmailStatus } from "@/types/admin"
import { ArrowLeft, Mail, MailCheck, MailX, MailWarning } from "lucide-react"
import { toast } from "react-toastify"

function EmailStatusBadge({ status }: { status: EmailStatus | undefined }) {
  const s: EmailStatus = status ?? "pending"
  const map = {
    sent:    { color: "#44d62c", bg: "rgba(68,214,44,0.12)",  Icon: MailCheck,   label: "Sent" },
    failed:  { color: "#ef4444", bg: "rgba(239,68,68,0.12)",  Icon: MailX,       label: "Failed" },
    pending: { color: "#F59E0B", bg: "rgba(245,158,11,0.12)", Icon: MailWarning, label: "Pending" },
  }[s]
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: map.bg, color: map.color,
      border: `1px solid ${map.color}33`, borderRadius: 999,
      padding: "3px 10px", fontSize: 11, fontWeight: 600,
    }}>
      <map.Icon className="w-3 h-3" /> {map.label}
    </span>
  )
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
}

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

const STATUS_OPTIONS: OrderStatus[] = ["pending", "paid", "delivered", "cancelled", "refunded"]

export function OrderDetail({ order: initial }: { order: Order }) {
  const router = useRouter()
  const [order, setOrder] = useState(initial)
  const [resending, setResending] = useState(false)

  async function handleStatusChange(newStatus: OrderStatus) {
    if (newStatus === order.status) return
    try {
      const updated = await updateOrderStatus(order._id, newStatus)
      // Backend may have populated emailStatus / keyAssignedAt on auto-fulfill
      setOrder(prev => ({ ...prev, ...updated }))
      toast.success(`Status updated → ${updated.status}`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? "Failed to update status"
      toast.error(msg)
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      const res = await resendDeliveryEmail(order._id)
      setOrder(prev => ({ ...prev, emailStatus: res.emailStatus as EmailStatus, emailSentAt: res.emailSentAt }))
      toast.success("Delivery email resent")
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? "Resend failed"
      toast.error(msg)
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2"
        style={{
          background: "rgba(28,30,42,0.60)", backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)", border: "1px solid rgba(188,188,201,0.15)",
          borderRadius: 10, color: "#b3bade", fontSize: 13, padding: "6px 14px", cursor: "pointer",
        }}
      >
        <ArrowLeft className="w-4 h-4" /> Back to Orders
      </button>

      {/* Header */}
      <div style={PANEL} className="p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p style={{ fontSize: 12, color: "#9fa0a1", marginBottom: 2 }}>Order ID</p>
            <p style={{ fontSize: 14, color: "#fff", fontFamily: "monospace" }}>{order._id}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: "#9fa0a1", marginBottom: 2 }}>Customer</p>
            <p style={{ fontSize: 14, color: "#fff" }}>{order.customerEmail}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: "#9fa0a1", marginBottom: 2 }}>Date</p>
            <p style={{ fontSize: 14, color: "#fff" }}>{new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: "#9fa0a1", marginBottom: 2 }}>Payment Ref</p>
            <p style={{ fontSize: 14, color: "#b3bade" }}>{order.paymentRef || "—"}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: "#9fa0a1", marginBottom: 6 }}>Status</p>
            <StatusBadge status={order.status} />
          </div>
        </div>
      </div>

      {/* Items */}
      <div style={{ ...PANEL, overflow: "hidden" }}>
        <div className="p-5" style={{ borderBottom: "1px solid rgba(188,188,201,0.10)" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "#b3bade" }}>Items</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow style={{ borderColor: "rgba(188,188,201,0.10)" }}>
              {["Product", "Qty", "Unit Price", "Subtotal"].map(h => (
                <TableHead key={h} style={{ color: "#9fa0a1", fontSize: 12 }}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item, i) => (
              <TableRow key={i} style={{ borderColor: "rgba(188,188,201,0.08)" }}>
                <TableCell style={{ color: "#fff", fontSize: 13 }}>{item.productName}</TableCell>
                <TableCell style={{ color: "#b3bade", fontSize: 13 }}>{item.quantity}</TableCell>
                <TableCell style={{ color: "#b3bade", fontSize: 13 }}>{currency.format(item.unitPrice)}</TableCell>
                <TableCell style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>
                  {currency.format(item.unitPrice * item.quantity)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="p-4 flex justify-end" style={{ borderTop: "1px solid rgba(188,188,201,0.10)" }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
            Total: {currency.format(order.totalAmount)}
          </p>
        </div>
      </div>

      {/* Fulfillment & email */}
      <div style={PANEL} className="p-5">
        <p style={{ fontSize: 14, fontWeight: 600, color: "#b3bade", marginBottom: 12 }}>Fulfillment</p>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p style={{ fontSize: 11, color: "#9fa0a1", marginBottom: 4 }}>Delivery Email</p>
            <EmailStatusBadge status={order.emailStatus} />
            {order.emailSentAt && (
              <p style={{ fontSize: 11, color: "#9fa0a1", marginTop: 4 }}>
                Sent: {new Date(order.emailSentAt).toLocaleString()}
              </p>
            )}
          </div>
          <div>
            <p style={{ fontSize: 11, color: "#9fa0a1", marginBottom: 4 }}>Key Assigned</p>
            <p style={{ fontSize: 12, color: "#fff" }}>
              {order.keyAssignedAt ? new Date(order.keyAssignedAt).toLocaleString() : "—"}
            </p>
          </div>
          {order.status === "delivered" && (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              style={{
                background: "rgba(100,117,209,0.15)",
                border: "1px solid rgba(100,117,209,0.30)",
                borderRadius: 10, padding: "8px 14px",
                color: "#6475D1", fontSize: 12, fontWeight: 600,
                cursor: resending ? "wait" : "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <Mail className="w-3.5 h-3.5" />
              {resending ? "Sending…" : "Resend delivery email"}
            </button>
          )}
        </div>
      </div>

      {/* Status update */}
      <div style={PANEL} className="p-5">
        <p style={{ fontSize: 14, fontWeight: 600, color: "#b3bade", marginBottom: 12 }}>Update Status</p>
        <div style={{ maxWidth: 200 }}>
          <Select value={order.status} onValueChange={val => { if (val) handleStatusChange(val as OrderStatus) }}>
            <SelectTrigger style={{ ...INPUT_STYLE, height: 38 }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: "#1c1e2a", border: "1px solid rgba(188,188,201,0.15)", borderRadius: 10 }}>
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s} value={s} style={{ color: "#fff", fontSize: 13, textTransform: "capitalize" }}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p style={{ fontSize: 11, color: "#9fa0a1", marginTop: 10, lineHeight: 1.5 }}>
          Setting status to <strong style={{ color: "#b3bade" }}>delivered</strong> auto-assigns a key (if needed) and sends the delivery email.
        </p>
      </div>
    </div>
  )
}
