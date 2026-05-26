import { ProductForm } from "@/components/admin/ProductForm"

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>New Product</h1>
        <p style={{ fontSize: 13, color: "#9fa0a1", marginTop: 4 }}>
          Add a new product to your catalogue.
        </p>
      </header>
      <ProductForm mode="create" />
    </div>
  )
}
