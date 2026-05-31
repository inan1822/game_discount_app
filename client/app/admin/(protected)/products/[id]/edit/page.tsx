import { fetchProduct } from "@/lib/api/admin.server"
import { ProductForm } from "@/components/admin/ProductForm"
import { SectionHeading } from "@/components/ui/SectionHeading"
import { notFound } from "next/navigation"

const PAGE: React.CSSProperties = {
  width: "min(calc(100% - 192px), 1600px)",
  marginInline: "auto",
  paddingBlock: 40,
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params
  const product = await fetchProduct(id)
  if (!product) notFound()

  return (
    <div style={PAGE}>
      <SectionHeading title="Edit Product" />
      <p style={{ fontSize: 13, color: "#9fa0a1", marginTop: -8, marginBottom: 20 }}>{product.name}</p>
      <ProductForm mode="edit" product={product} />
    </div>
  )
}
