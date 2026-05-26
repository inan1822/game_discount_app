import { fetchServerPromos, fetchServerBroadcastHistory } from "@/lib/api/admin.server"
import { PromosTable } from "@/components/admin/PromosTable"
import { BroadcastForm } from "@/components/admin/BroadcastForm"
import { Megaphone } from "lucide-react"

export default async function MarketingPage() {
  const [promosData, history] = await Promise.all([
    fetchServerPromos(),
    fetchServerBroadcastHistory(),
  ])

  return (
    <div className="space-y-10">
      {/* Page header */}
      <header>
        <div className="flex items-center gap-3 mb-1">
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(100,117,209,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Megaphone className="w-4 h-4" style={{ color: "#6475D1" }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>Marketing</h1>
        </div>
        <p style={{ color: "#9fa0a1", fontSize: 13, marginLeft: 48 }}>
          Promo codes and broadcast notifications
        </p>
      </header>

      {/* Promo codes section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Promo Codes</h2>
          <span style={{
            background: "rgba(68,214,44,0.10)", color: "#44d62c",
            borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "2px 8px",
          }}>
            {promosData.total}
          </span>
        </div>
        <PromosTable initial={promosData.promos} />
      </section>

      {/* Broadcast section */}
      <section>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 16 }}>
          Broadcast Notification
        </h2>
        <BroadcastForm initialHistory={history} />
      </section>
    </div>
  )
}
