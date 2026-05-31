import { fetchProducts } from "@/lib/api/admin.server"
import { ProductsTable } from "@/components/admin/ProductsTable"
import { SectionHeading } from "@/components/ui/SectionHeading"

const PAGE: React.CSSProperties = {
  width: "min(calc(100% - 192px), 1600px)",
  marginInline: "auto",
  paddingBlock: 40,
}

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
    <div style={PAGE}>
      <SectionHeading title="Products" />
      <p style={{ fontSize: 13, color: "#9fa0a1", marginTop: -8, marginBottom: 20 }}>
        Manage your virtual goods catalogue — game keys, gift cards, subscriptions and more.
      </p>
      <ProductsTable initialData={data} />
    </div>
  )
}
