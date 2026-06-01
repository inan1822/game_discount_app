"use client"
import { useState, useEffect, useCallback } from "react"
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { TrendingUp, ShoppingCart, Users, Package } from "lucide-react"
import { fetchAnalytics } from "@/lib/api/admin.client"
import { SectionHeading } from "@/shared/components/SectionHeading"
import type { AnalyticsData } from "@/shared/types/admin"

const PAGE: React.CSSProperties = {
  width: "min(calc(100% - 192px), 1600px)",
  marginInline: "auto",
  paddingBlock: 40,
}

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
const currencyFull = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

const PANEL: React.CSSProperties = {
  background: "rgba(28,30,42,0.70)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border: "1px solid rgba(188,188,201,0.15)",
  borderRadius: 10,
}

const STATUS_COLORS: Record<string, string> = {
  delivered: "#44d62c",
  paid:      "#6475D1",
  pending:   "#f59e0b",
  cancelled: "#ef4444",
  refunded:  "#9fa0a1",
}

const CAT_LABELS: Record<string, string> = {
  gamekey:      "Game Keys",
  giftcard:     "Gift Cards",
  subscription: "Subscriptions",
  dlc:          "DLC",
  currency:     "Currency",
  unknown:      "Other",
}

const CAT_COLORS = ["#6475D1", "#44d62c", "#f59e0b", "#2ab7e6", "#AE3BD6", "#9fa0a1"]

const PERIODS = [
  { value: 7,  label: "7 days"  },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
] as const

// ── Tooltip styles ─────────────────────────────────────────────────────────
const TOOLTIP_STYLE = {
  background: "#1c1e2a",
  border: "1px solid rgba(188,188,201,0.20)",
  borderRadius: 10,
  color: "#fff",
  fontSize: 12,
}

function formatDate(date: string, period: number) {
  const d = new Date(date)
  if (period <= 7) return d.toLocaleDateString("en-US", { weekday: "short" })
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// ── KPI card ──────────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string
}) {
  return (
    <div style={{ ...PANEL, padding: "20px" }}>
      <div className="flex items-start gap-3">
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${color}18`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div>
          <p style={{ color: "#9fa0a1", fontSize: 11, fontWeight: 500, marginBottom: 4 }}>{label}</p>
          <p style={{ color: "#fff", fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{value}</p>
          {sub && <p style={{ color: "#9fa0a1", fontSize: 11, marginTop: 4 }}>{sub}</p>}
        </div>
      </div>
    </div>
  )
}

// ── Section heading ────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, color: "#9fa0a1",
      letterSpacing: "0.10em", textTransform: "uppercase",
      marginBottom: 16,
    }}>
      {children}
    </p>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────
function Skeleton({ height = 260 }: { height?: number }) {
  return (
    <div style={{
      ...PANEL, height,
      animation: "pulse 1.5s ease-in-out infinite",
    }} />
  )
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<7 | 30 | 90>(30)
  const [data,   setData]   = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (p: 7 | 30 | 90) => {
    setLoading(true)
    try {
      const result = await fetchAnalytics(p)
      setData(result)
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(period) }, [period, load])

  const revenueSeries = data?.revenue.series.map(d => ({
    ...d,
    label: formatDate(d.date, period),
  })) ?? []

  const ordersSeries = data?.orders.series.map(d => ({
    ...d,
    label: formatDate(d.date, period),
  })) ?? []

  const signupsSeries = data?.users.series.map(d => ({
    ...d,
    label: formatDate(d.date, period),
  })) ?? []

  const statusPieData = data
    ? Object.entries(data.orders.byStatus)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }))
    : []

  return (
    <div style={PAGE}>
      {/* Header + period toggle */}
      <SectionHeading
        title="Analytics"
        right={
          <div className="flex gap-1" style={{
            background: "rgba(28,30,42,0.70)",
            border: "1px solid rgba(188,188,201,0.15)",
            borderRadius: 10, padding: 4,
          }}>
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                style={{
                  background: period === p.value ? "#6475D1" : "transparent",
                  color:  period === p.value ? "#fff" : "#9fa0a1",
                  border: "none", borderRadius: 8,
                  padding: "6px 14px", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", transition: "background 0.15s, color 0.15s",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />
      <p style={{ color: "#9fa0a1", fontSize: 13, marginTop: -8, marginBottom: 24 }}>
        Store performance overview
      </p>

      <div className="space-y-6">

      {/* KPI row */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={88} />)}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            icon={TrendingUp} label="Revenue" color="#44d62c"
            value={currency.format(data.revenue.total)}
            sub={`Last ${data.period} days`}
          />
          <KpiCard
            icon={ShoppingCart} label="Orders" color="#6475D1"
            value={String(data.orders.total)}
            sub={`${data.orders.byStatus.delivered ?? 0} delivered`}
          />
          <KpiCard
            icon={Users} label="New users" color="#2ab7e6"
            value={String(data.users.newTotal)}
            sub={`Last ${data.period} days`}
          />
          <KpiCard
            icon={Package} label="Avg order value" color="#f59e0b"
            value={currencyFull.format(data.avgOrderValue)}
            sub="Delivered orders"
          />
        </div>
      ) : null}

      {/* Revenue area chart */}
      <div style={{ ...PANEL, padding: "20px 24px" }}>
        <SectionTitle>Revenue</SectionTitle>
        {loading ? <Skeleton height={220} /> : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueSeries} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#44d62c" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#44d62c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(188,188,201,0.07)" />
              <XAxis dataKey="label" tick={{ fill: "#9fa0a1", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9fa0a1", fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${v}`} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: unknown) => currencyFull.format(v as number)}
                labelStyle={{ color: "#9fa0a1" }}
              />
              <Area
                type="monotone" dataKey="revenue"
                stroke="#44d62c" strokeWidth={2}
                fill="url(#rev-grad)" dot={false} activeDot={{ r: 4, fill: "#44d62c" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Orders area chart + Status donut — side by side on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Orders per day */}
        <div style={{ ...PANEL, padding: "20px 24px" }}>
          <SectionTitle>Orders per day</SectionTitle>
          {loading ? <Skeleton height={200} /> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={ordersSeries} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="ord-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6475D1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6475D1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(188,188,201,0.07)" />
                <XAxis dataKey="label" tick={{ fill: "#9fa0a1", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#9fa0a1", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: unknown) => String(v)}
                  labelStyle={{ color: "#9fa0a1" }}
                />
                <Area
                  type="monotone" dataKey="count"
                  stroke="#6475D1" strokeWidth={2}
                  fill="url(#ord-grad)" dot={false} activeDot={{ r: 4, fill: "#6475D1" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Order status distribution */}
        <div style={{ ...PANEL, padding: "20px 24px" }}>
          <SectionTitle>Order status breakdown</SectionTitle>
          {loading ? <Skeleton height={200} /> : statusPieData.length === 0 ? (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#9fa0a1", fontSize: 13 }}>
              No orders in this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusPieData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={STATUS_COLORS[entry.name] ?? "#9fa0a1"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: unknown) => String(v)}
                  labelStyle={{ color: "#9fa0a1" }}
                />
                <Legend
                  iconType="circle" iconSize={8}
                  formatter={(val: string) => (
                    <span style={{ color: "#b3bade", fontSize: 12 }}>{val}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* New user signups bar chart */}
      <div style={{ ...PANEL, padding: "20px 24px" }}>
        <SectionTitle>New user signups</SectionTitle>
        {loading ? <Skeleton height={200} /> : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={signupsSeries} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="rgba(188,188,201,0.07)" />
              <XAxis dataKey="label" tick={{ fill: "#9fa0a1", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9fa0a1", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: unknown) => String(v)}
                labelStyle={{ color: "#9fa0a1" }}
              />
              <Bar dataKey="count" fill="#2ab7e6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Category breakdown + Top products — side by side on lg+ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category revenue */}
        <div style={{ ...PANEL, padding: "20px 24px" }}>
          <SectionTitle>Revenue by category</SectionTitle>
          {loading ? <Skeleton height={220} /> : data?.categoryBreakdown.length === 0 ? (
            <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#9fa0a1", fontSize: 13 }}>
              No sales in this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={data?.categoryBreakdown.map(c => ({
                  ...c,
                  label: CAT_LABELS[c.category] ?? c.category,
                }))}
                layout="vertical"
                margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
              >
                <CartesianGrid stroke="rgba(188,188,201,0.07)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#9fa0a1", fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${v}`} />
                <YAxis type="category" dataKey="label" tick={{ fill: "#b3bade", fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: unknown) => currencyFull.format(v as number)}
                  labelStyle={{ color: "#9fa0a1" }}
                />
                {data?.categoryBreakdown.map((c, i) => (
                  <Cell key={c.category} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                ))}
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {data?.categoryBreakdown.map((_c, i) => (
                    <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top products table */}
        <div style={{ ...PANEL, padding: "20px 24px" }}>
          <SectionTitle>Top products by revenue</SectionTitle>
          {loading ? <Skeleton height={220} /> : (
            <div className="space-y-2">
              {data?.topProducts.length === 0 && (
                <p style={{ color: "#9fa0a1", fontSize: 13, paddingTop: 60, textAlign: "center" }}>
                  No sales in this period
                </p>
              )}
              {data?.topProducts.map((p, i) => {
                const maxRev = data.topProducts[0]?.revenue ?? 1
                const pct    = Math.round((p.revenue / maxRev) * 100)
                return (
                  <div key={p.id}>
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span style={{
                          width: 20, height: 20, borderRadius: "50%",
                          background: "rgba(100,117,209,0.15)", color: "#6475D1",
                          fontSize: 10, fontWeight: 800, flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {i + 1}
                        </span>
                        <p style={{
                          color: "#fff", fontSize: 12, fontWeight: 600,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {p.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span style={{ color: "#9fa0a1", fontSize: 11 }}>{p.sold} sold</span>
                        <span style={{ color: "#44d62c", fontSize: 13, fontWeight: 700 }}>
                          {currency.format(p.revenue)}
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div style={{
                      height: 4, borderRadius: 999,
                      background: "rgba(188,188,201,0.08)",
                      marginBottom: i < (data?.topProducts.length ?? 0) - 1 ? 8 : 0,
                    }}>
                      <div style={{
                        height: "100%", borderRadius: 999,
                        width: `${pct}%`,
                        background: "linear-gradient(90deg, #6475D1, #44d62c)",
                        transition: "width 0.4s ease",
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
