import { fetchOrder } from "@/lib/api/admin.server"
import { OrderDetail } from "@/components/admin/OrderDetail"
import { SectionHeading } from "@/shared/components/SectionHeading"
import { notFound } from "next/navigation"

const PAGE: React.CSSProperties = {
  width: "min(calc(100% - 192px), 1600px)",
  marginInline: "auto",
  paddingBlock: 40,
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const order = await fetchOrder(id)
  if (!order) notFound()

  return (
    <div style={PAGE}>
      <SectionHeading title="Order Detail" />
      <OrderDetail order={order} />
    </div>
  )
}
