import { ProductForm } from "@/components/admin/ProductForm"
import { SectionHeading } from "@/components/ui/SectionHeading"

const PAGE: React.CSSProperties = {
  width: "min(calc(100% - 192px), 1600px)",
  marginInline: "auto",
  paddingBlock: 40,
}

export default function NewProductPage() {
  return (
    <div style={PAGE}>
      <SectionHeading title="New Product" />
      <p style={{ fontSize: 13, color: "#9fa0a1", marginTop: -8, marginBottom: 20 }}>
        Add a new product to your catalogue.
      </p>
      <ProductForm mode="create" />
    </div>
  )
}
