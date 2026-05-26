import { fetchProduct } from "@/lib/api/admin.server"
import { ProductForm } from "@/components/admin/ProductForm"
import { notFound } from "next/navigation"

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params
  const product = await fetchProduct(id)
  if (!product) notFound()

  return (
    <div className="space-y-6">
      <header>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>Edit Product</h1>
        <p style={{ fontSize: 13, color: "#9fa0a1", marginTop: 4 }}>{product.name}</p>
      </header>
      <ProductForm mode="edit" product={product} />
    </div>
  )
}
