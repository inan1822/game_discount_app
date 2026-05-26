import { fetchOrder } from "@/lib/api/admin.server"
import { OrderDetail } from "@/components/admin/OrderDetail"
import { notFound } from "next/navigation"

interface Props {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const order = await fetchOrder(id)
  if (!order) notFound()

  return (
    <div className="space-y-6">
      <header>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>Order Detail</h1>
      </header>
      <OrderDetail order={order} />
    </div>
  )
}
