"use client"
import { motion } from "framer-motion"
import {
  TrendingUp, TrendingDown,
  DollarSign, ShoppingCart, Users, AlertTriangle, Package,
} from "lucide-react"

// Icon prop is a string key, NOT a Lucide component — RSC → client component
// can't serialize the icon's render function. The lookup happens inside this
// client boundary instead.
export type StatsIconName = "revenue" | "orders" | "users" | "lowStock" | "products"

const ICONS = {
  revenue:  DollarSign,
  orders:   ShoppingCart,
  users:    Users,
  lowStock: AlertTriangle,
  products: Package,
} as const

const ACCENT = {
  green: { fg: "#44d62c", bg: "rgba(68,214,44,0.10)" },
  blue:  { fg: "#6475D1", bg: "rgba(100,117,209,0.12)" },
  amber: { fg: "#f59e0b", bg: "rgba(245,158,11,0.10)" },
  red:   { fg: "#ef4444", bg: "rgba(239,68,68,0.10)" },
} as const

interface Props {
  label: string
  value: string | number
  deltaPct?: number
  icon: StatsIconName
  accent?: keyof typeof ACCENT
}

export function StatsCard({ label, value, deltaPct, icon, accent = "blue" }: Props) {
  const Icon = ICONS[icon]
  const positive = (deltaPct ?? 0) >= 0
  const { fg, bg } = ACCENT[accent]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5"
      style={{
        background: "rgba(28,30,42,0.70)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid rgba(188,188,201,0.15)",
        borderRadius: 10,
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p style={{ fontSize: 13, color: "#9fa0a1" }}>{label}</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginTop: 4 }}>{value}</p>
        </div>
        <div
          className="p-2"
          style={{ borderRadius: 10, background: bg, color: fg }}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {deltaPct != null && (
        <div
          className="flex items-center gap-1 mt-3"
          style={{ fontSize: 12, color: positive ? "#44d62c" : "#ef4444" }}
        >
          {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(deltaPct).toFixed(1)}% vs last period
        </div>
      )}
    </motion.div>
  )
}
