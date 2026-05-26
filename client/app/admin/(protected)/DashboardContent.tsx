import { StatsCard } from "@/components/admin/StatsCard"
import { RevenueChart } from "./RevenueChart"
import { fetchDashboardStats } from "@/lib/api/admin.server"

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

// Frosted-glass panel on top of the animated PageBackground — matches the
// rest of the app's elevated-surface look.
const PANEL_STYLE: React.CSSProperties = {
  background: "rgba(28,30,42,0.70)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border: "1px solid rgba(188,188,201,0.15)",
  borderRadius: 10,
}

export async function DashboardContent() {
  const stats = await fetchDashboardStats()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Revenue"
          value={currency.format(stats.revenue.total)}
          deltaPct={stats.revenue.deltaPct}
          icon="revenue"
          accent="green"
        />
        <StatsCard
          label="Orders Today"
          value={stats.ordersToday.count}
          deltaPct={stats.ordersToday.deltaPct}
          icon="orders"
          accent="blue"
        />
        <StatsCard
          label="Active Users"
          value={stats.activeUsers.count}
          deltaPct={stats.activeUsers.deltaPct}
          icon="users"
          accent="amber"
        />
        <StatsCard
          label="Low Stock"
          value={stats.lowStock.count}
          icon="lowStock"
          accent="red"
        />
      </div>

      <section className="p-5" style={PANEL_STYLE}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "#b3bade", marginBottom: 16 }}>
          Revenue (last 14 days)
        </h2>
        <RevenueChart data={stats.revenueSeries} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 p-5" style={PANEL_STYLE}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "#b3bade", marginBottom: 16 }}>
            Recent Orders
          </h2>
          {stats.recentOrders.length === 0 ? (
            <p style={{ fontSize: 13, color: "#9fa0a1" }}>No orders yet.</p>
          ) : (
            <ul className="divide-y" style={{ borderColor: "rgba(188,188,201,0.10)" }}>
              {stats.recentOrders.map(o => (
                <li key={o.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p style={{ color: "#fff", fontSize: 14 }}>{o.productName}</p>
                    <p style={{ color: "#9fa0a1", fontSize: 12 }}>{o.customerEmail}</p>
                  </div>
                  <div className="text-right">
                    <p style={{ color: "#fff", fontSize: 14 }}>{currency.format(o.amount)}</p>
                    <p style={{ color: "#9fa0a1", fontSize: 12, textTransform: "capitalize" }}>{o.status}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="p-5" style={PANEL_STYLE}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "#b3bade", marginBottom: 16 }}>
            Top Products
          </h2>
          {stats.topProducts.length === 0 ? (
            <p style={{ fontSize: 13, color: "#9fa0a1" }}>No sales yet.</p>
          ) : (
            <ul className="space-y-3">
              {stats.topProducts.map(p => (
                <li key={p.id} className="flex items-center justify-between">
                  <span style={{ color: "#fff", fontSize: 14 }}>{p.name}</span>
                  <span style={{ color: "#9fa0a1", fontSize: 12 }}>{p.sold} sold</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
