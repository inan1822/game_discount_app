import { fetchOrders } from "@/lib/api/admin.server"
import { OrdersTable } from "@/components/admin/OrdersTable"

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
    <div className="space-y-6">
      <header>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>Orders</h1>
        <p style={{ fontSize: 13, color: "#9fa0a1", marginTop: 4 }}>
          Manage customer orders and update fulfilment status.
        </p>
      </header>
      <OrdersTable initialData={data} />
    </div>
  )
}
