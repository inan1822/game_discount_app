import { fetchProduct } from "@/lib/api/admin.server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Edit, Key } from "lucide-react"

const PANEL: React.CSSProperties = {
  background: "rgba(28,30,42,0.70)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border: "1px solid rgba(188,188,201,0.15)",
  borderRadius: 10,
}

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params
  const product = await fetchProduct(id)
  if (!product) notFound()

  const stats = product.keyStats

  return (
    <div className="space-y-6 max-w-2xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>{product.name}</h1>
          {product.rawgGameName && (
            <p style={{ fontSize: 13, color: "#9fa0a1", marginTop: 4 }}>{product.rawgGameName}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/products/${id}/edit`} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(100,117,209,0.20)", color: "#6475D1",
            border: "1px solid rgba(100,117,209,0.30)", borderRadius: 10,
            padding: "7px 14px", fontSize: 13, textDecoration: "none",
          }}>
            <Edit className="w-4 h-4" /> Edit
          </Link>
          <Link href={`/admin/products/${id}/keys`} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(68,214,44,0.12)", color: "#44d62c",
            border: "1px solid rgba(68,214,44,0.25)", borderRadius: 10,
            padding: "7px 14px", fontSize: 13, textDecoration: "none",
          }}>
            <Key className="w-4 h-4" /> Manage Keys
          </Link>
        </div>
      </header>

      {/* Cover */}
      {product.imageUrl && (
        <img src={product.imageUrl} alt={product.name}
          style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 10 }} />
      )}

      {/* Meta */}
      <div style={PANEL} className="p-5">
        <div className="grid grid-cols-2 gap-6">
          {[
            ["Category",  product.category],
            ["Platform",  product.platform],
            ["Price",     currency.format(product.price)],
            ["Status",    product.isActive ? "Active" : "Inactive"],
          ].map(([label, value]) => (
            <div key={label}>
              <p style={{ fontSize: 12, color: "#9fa0a1", marginBottom: 4 }}>{label}</p>
              <p style={{ fontSize: 14, color: "#fff", fontWeight: 600, textTransform: "capitalize" }}>{value}</p>
            </div>
          ))}
        </div>

        {product.description && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid rgba(188,188,201,0.10)" }}>
            <p style={{ fontSize: 12, color: "#9fa0a1", marginBottom: 6 }}>Description</p>
            <p style={{ fontSize: 13, color: "#b3bade", lineHeight: 1.6 }}>{product.description}</p>
          </div>
        )}
      </div>

      {/* Key stats */}
      {stats && (
        <div style={PANEL} className="p-5">
          <p style={{ fontSize: 14, fontWeight: 600, color: "#b3bade", marginBottom: 16 }}>Key Inventory</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Available", count: stats.available, color: "#44d62c", bg: "rgba(68,214,44,0.10)" },
              { label: "Reserved",  count: stats.reserved,  color: "#f59e0b", bg: "rgba(245,158,11,0.10)" },
              { label: "Sold",      count: stats.sold,      color: "#9fa0a1", bg: "rgba(159,160,161,0.10)" },
            ].map(({ label, count, color, bg }) => (
              <div key={label} style={{ background: bg, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 28, fontWeight: 700, color }}>{count}</p>
                <p style={{ fontSize: 12, color: "#9fa0a1", marginTop: 4 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
