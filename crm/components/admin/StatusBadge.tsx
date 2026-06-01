"use client"
import type { OrderStatus } from "@/types/admin"

const STYLE: Record<OrderStatus, { bg: string; color: string; label: string }> = {
  pending:   { bg: "rgba(245,158,11,0.15)",  color: "#f59e0b", label: "Pending"   },
  paid:      { bg: "rgba(100,117,209,0.15)", color: "#6475D1", label: "Paid"      },
  delivered: { bg: "rgba(68,214,44,0.15)",   color: "#44d62c", label: "Delivered" },
  cancelled: { bg: "rgba(239,68,68,0.15)",   color: "#ef4444", label: "Cancelled" },
  refunded:  { bg: "rgba(159,160,161,0.15)", color: "#9fa0a1", label: "Refunded"  },
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { bg, color, label } = STYLE[status] ?? STYLE.pending
  return (
    <span
      style={{
        background: bg,
        color,
        fontSize: 11,
        fontWeight: 700,
        borderRadius: 999,
        padding: "3px 10px",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  )
}
