import { fetchProducts } from "@/lib/api/admin.server"
import { ProductsTable } from "@/components/admin/ProductsTable"

interface Props {
  searchParams: Promise<Record<string, string>>
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams
  const data = await fetchProducts({
    page:     params.page     ? parseInt(params.page) : 1,
    search:   params.search   || undefined,
    category: params.category !== "all" ? params.category : undefined,
    platform: params.platform !== "all" ? params.platform : undefined,
    isActive: params.isActive !== undefined ? params.isActive === "true" : undefined,
  })

  return (
    <div className="space-y-6">
      <header>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>Products</h1>
        <p style={{ fontSize: 13, color: "#9fa0a1", marginTop: 4 }}>
          Manage your virtual goods catalogue — game keys, gift cards, subscriptions and more.
        </p>
      </header>
      <ProductsTable initialData={data} />
    </div>
  )
}
