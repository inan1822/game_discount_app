import { fetchOrders } from "@/lib/api/admin.server"
import { OrdersTable } from "@/components/admin/OrdersTable"
import { SectionHeading } from "@/components/ui/SectionHeading"

const PAGE: React.CSSProperties = {
  width: "min(calc(100% - 192px), 1600px)",
  marginInline: "auto",
  paddingBlock: 40,
}

interface Props {
  searchParams: Promise<Record<string, string>>
}

export default async function OrdersPage({ searchParams }: Props) {
  const params = await searchParams
  const data = await fetchOrders({
    page:   params.page   ? parseInt(params.page)  : 1,
    status: params.status !== "all" ? params.status : undefined,
    search: params.search || undefined,
    from:   params.from   || undefined,
    to:     params.to     || undefined,
  })

  return (
    <div style={PAGE}>
      <SectionHeading title="Orders" />
      <p style={{ fontSize: 13, color: "#9fa0a1", marginTop: -8, marginBottom: 20 }}>
        Manage customer orders and update fulfilment status.
      </p>
      <OrdersTable initialData={data} />
    </div>
  )
}
