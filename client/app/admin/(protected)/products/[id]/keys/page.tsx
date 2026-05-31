import { fetchProduct, fetchProductKeys } from "@/lib/api/admin.server"
import { KeysTable } from "@/components/admin/KeysTable"
import { KeyUploader } from "@/components/admin/KeyUploader"
import { SectionHeading } from "@/components/ui/SectionHeading"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

const PAGE: React.CSSProperties = {
  width: "min(calc(100% - 192px), 1600px)",
  marginInline: "auto",
  paddingBlock: 40,
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProductKeysPage({ params }: Props) {
  const { id } = await params
  const [product, keysPage] = await Promise.all([
    fetchProduct(id),
    fetchProductKeys(id, { limit: 50 }),
  ])
  if (!product) notFound()

  return (
    <div style={PAGE}>
      <Link
        href={`/admin/products/${id}`}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgba(28,30,42,0.60)", backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)", border: "1px solid rgba(188,188,201,0.15)",
          borderRadius: 10, color: "#b3bade", fontSize: 13,
          padding: "6px 14px", textDecoration: "none", marginBottom: 20,
        }}
      >
        <ArrowLeft className="w-4 h-4" /> Back to {product.name}
      </Link>

      <SectionHeading title="Key Inventory" />
      <p style={{ fontSize: 13, color: "#9fa0a1", marginTop: -8, marginBottom: 20 }}>
        {product.availableKeys} available · {product.totalKeys} total
      </p>

      <div className="space-y-6 max-w-3xl">
        <KeysTable productId={id} initialData={keysPage} />
        <KeyUploader productId={id} />
      </div>
    </div>
  )
}
