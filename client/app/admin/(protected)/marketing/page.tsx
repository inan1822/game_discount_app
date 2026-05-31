import { fetchServerPromos, fetchServerBroadcastHistory } from "@/lib/api/admin.server"
import { PromosTable } from "@/components/admin/PromosTable"
import { BroadcastForm } from "@/components/admin/BroadcastForm"
import { SectionHeading } from "@/components/ui/SectionHeading"

const PAGE: React.CSSProperties = {
  width: "min(calc(100% - 192px), 1600px)",
  marginInline: "auto",
  paddingBlock: 40,
}

export default async function MarketingPage() {
  const [promosData, history] = await Promise.all([
    fetchServerPromos(),
    fetchServerBroadcastHistory(),
  ])

  return (
    <div style={PAGE}>
      <SectionHeading title="Marketing" />
      <p style={{ color: "#9fa0a1", fontSize: 13, marginTop: -8, marginBottom: 32 }}>
        Promo codes and broadcast notifications
      </p>

      {/* Promo codes section */}
      <section className="mb-12">
        <SectionHeading
          title="Promo Codes"
          right={
            <span style={{
              background: "rgba(68,214,44,0.10)", color: "#44d62c",
              borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "2px 8px",
            }}>
              {promosData.total}
            </span>
          }
        />
        <PromosTable initial={promosData.promos} />
      </section>

      {/* Broadcast / push notifications section */}
      <section>
        <SectionHeading title="Push Notifications" />
        <BroadcastForm initialHistory={history} />
      </section>
    </div>
  )
}
