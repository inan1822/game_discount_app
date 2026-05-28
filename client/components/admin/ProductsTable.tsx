"use client"
import { useState, useTransition } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { deleteProduct, updateProduct } from "@/lib/api/admin.client"
import type { Product, ProductsPage } from "@/types/admin"
import { Plus, Search, Edit, Key, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "react-toastify"
import Link from "next/link"

const PANEL: React.CSSProperties = {
  background: "rgba(28,30,42,0.70)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border: "1px solid rgba(188,188,201,0.15)",
  borderRadius: 10,
}

const INPUT_STYLE: React.CSSProperties = {
  background: "#1c1e2a",
  border: "1px solid rgba(188,188,201,0.15)",
  borderRadius: 10,
  color: "#fff",
  fontSize: 13,
  padding: "6px 10px",
  outline: "none",
}

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

const CATEGORY_LABELS: Record<string, string> = {
  gamekey: "Game Key", giftcard: "Gift Card",
  subscription: "Subscription", dlc: "DLC", currency: "Currency",
}

const CATEGORY_OPTS = [
  { value: "all", label: "All categories" },
  ...Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l })),
]

const PLATFORM_OPTS = [
  { value: "all", label: "All platforms" },
  ...["PC", "PS5", "Xbox", "Switch", "Other"].map(v => ({ value: v, label: v })),
]

function StockBadge({ count }: { count: number }) {
  const color = count >= 5 ? "#44d62c" : count >= 1 ? "#f59e0b" : "#ef4444"
  const bg    = count >= 5 ? "rgba(68,214,44,0.12)" : count >= 1 ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)"
  return (
    <span style={{ background: bg, color, borderRadius: 999, fontSize: 11, fontWeight: 600, padding: "3px 10px" }}>
      {count} avail.
    </span>
  )
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span style={{
      background: "rgba(100,117,209,0.12)", color: "#6475D1",
      borderRadius: 999, fontSize: 11, fontWeight: 600, padding: "3px 10px",
    }}>
      {CATEGORY_LABELS[category] ?? category}
    </span>
  )
}

export function ProductsTable({ initialData }: { initialData: ProductsPage }) {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [products, setProducts] = useState(initialData.products)
  const [total]   = useState(initialData.total)
  const [pages]   = useState(initialData.pages)

  const page     = parseInt(searchParams.get("page")     || "1")
  const category = searchParams.get("category") || "all"
  const platform = searchParams.get("platform") || "all"
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "")

  function pushParams(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(overrides).forEach(([k, v]) => {
      if (v && v !== "all") params.set(k, v)
      else params.delete(k)
    })
    params.set("page", "1")
    startTransition(() => router.push(`${pathname}?${params}`))
  }

  function handlePage(next: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(next))
    startTransition(() => router.push(`${pathname}?${params}`))
  }

  async function handleToggleFeatured(product: Product) {
    const next = !product.isFeatured
    setProducts(prev => prev.map(p => p._id === product._id ? { ...p, isFeatured: next } : p))
    try {
      await updateProduct(product._id, { isFeatured: next } as never)
      toast.success(next ? "Marked as DisLow game" : "Removed from DisLow games")
    } catch {
      setProducts(prev => prev.map(p => p._id === product._id ? { ...p, isFeatured: !next } : p))
      toast.error("Failed to update featured flag")
    }
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone if no keys have been sold.`)) return
    try {
      await deleteProduct(product._id)
      setProducts(prev => prev.filter(p => p._id !== product._id))
      toast.success(product.availableKeys > 0 ? "Product deactivated" : "Product deleted")
    } catch {
      toast.error("Failed to delete product")
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div style={PANEL} className="p-4 flex flex-wrap gap-3 items-end justify-between">
        <form
          className="flex flex-wrap gap-3 items-end"
          onSubmit={e => { e.preventDefault(); pushParams({ search: searchInput }) }}
        >
          <div className="relative min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#9fa0a1" }} />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search products…"
              style={{ ...INPUT_STYLE, paddingLeft: 30, width: "100%" }}
            />
          </div>

          <div style={{ minWidth: 150 }}>
            <Select value={category} onValueChange={val => pushParams({ category: val ?? "all" })}>
              <SelectTrigger style={{ ...INPUT_STYLE, height: 36 }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "#1c1e2a", border: "1px solid rgba(188,188,201,0.15)", borderRadius: 10 }}>
                {CATEGORY_OPTS.map(o => (
                  <SelectItem key={o.value} value={o.value} style={{ color: "#fff", fontSize: 13 }}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div style={{ minWidth: 140 }}>
            <Select value={platform} onValueChange={val => pushParams({ platform: val ?? "all" })}>
              <SelectTrigger style={{ ...INPUT_STYLE, height: 36 }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "#1c1e2a", border: "1px solid rgba(188,188,201,0.15)", borderRadius: 10 }}>
                {PLATFORM_OPTS.map(o => (
                  <SelectItem key={o.value} value={o.value} style={{ color: "#fff", fontSize: 13 }}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <button type="submit" style={{
            background: "rgba(100,117,209,0.20)", color: "#6475D1",
            border: "1px solid rgba(100,117,209,0.30)", borderRadius: 10,
            padding: "6px 16px", fontSize: 13, cursor: "pointer",
          }}>
            Apply
          </button>
        </form>

        <Link
          href="/admin/products/new"
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#6475D1", color: "#fff",
            borderRadius: 10, padding: "7px 16px", fontSize: 13,
            fontWeight: 600, textDecoration: "none",
          }}
        >
          <Plus className="w-4 h-4" />
          New Product
        </Link>
      </div>

      {/* Table */}
      <div style={{ ...PANEL, overflow: "hidden" }}>
        {isPending && (
          <div style={{ height: 3, background: "#6475D1", borderRadius: 3, animation: "pulse 1s infinite" }} />
        )}

        <Table>
          <TableHeader>
            <TableRow style={{ borderColor: "rgba(188,188,201,0.10)" }}>
              {["", "Name", "Category", "Platform", "Price", "Stock", "Active", "Featured", "Actions"].map(h => (
                <TableHead key={h} style={{ color: "#9fa0a1", fontSize: 12, fontWeight: 600 }}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} style={{ textAlign: "center", color: "#9fa0a1", padding: "40px 0" }}>
                  No products yet. <Link href="/admin/products/new" style={{ color: "#6475D1" }}>Create one →</Link>
                </TableCell>
              </TableRow>
            ) : (
              products.map(p => (
                <TableRow key={p._id} style={{ borderColor: "rgba(188,188,201,0.08)" }}>
                  {/* Thumbnail */}
                  <TableCell style={{ width: 52 }}>
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt=""
                        style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 10 }}
                      />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(188,188,201,0.08)" }} />
                    )}
                  </TableCell>
                  <TableCell>
                    <p style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{p.name}</p>
                    {p.rawgGameName && (
                      <p style={{ color: "#9fa0a1", fontSize: 11 }}>{p.rawgGameName}</p>
                    )}
                  </TableCell>
                  <TableCell><CategoryBadge category={p.category} /></TableCell>
                  <TableCell style={{ color: "#b3bade", fontSize: 13 }}>{p.platform}</TableCell>
                  <TableCell style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{currency.format(p.price)}</TableCell>
                  <TableCell><StockBadge count={p.availableKeys} /></TableCell>
                  <TableCell>
                    <span style={{
                      fontSize: 11, fontWeight: 600, borderRadius: 999, padding: "3px 10px",
                      background: p.isActive ? "rgba(68,214,44,0.12)" : "rgba(239,68,68,0.12)",
                      color: p.isActive ? "#44d62c" : "#ef4444",
                    }}>
                      {p.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleToggleFeatured(p)}
                      title={p.isFeatured ? "Remove from DisLow games" : "Add to DisLow games"}
                      style={{
                        fontSize: 11, fontWeight: 600, borderRadius: 999, padding: "3px 10px",
                        background: p.isFeatured ? "rgba(174,59,214,0.18)" : "rgba(188,188,201,0.08)",
                        color:      p.isFeatured ? "#AE3BD6"               : "#9fa0a1",
                        border: "1px solid " + (p.isFeatured ? "rgba(174,59,214,0.35)" : "rgba(188,188,201,0.15)"),
                        cursor: "pointer",
                      }}
                    >
                      {p.isFeatured ? "Featured" : "Off"}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/products/${p._id}/edit`} title="Edit"
                        style={{ color: "#6475D1", display: "flex" }}>
                        <Edit className="w-4 h-4" />
                      </Link>
                      <Link href={`/admin/products/${p._id}/keys`} title="Keys"
                        style={{ color: "#9fa0a1", display: "flex" }}>
                        <Key className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(p)}
                        title="Delete"
                        style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", display: "flex" }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {pages > 1 && (
          <div className="flex items-center justify-between p-4" style={{ borderTop: "1px solid rgba(188,188,201,0.10)" }}>
            <p style={{ fontSize: 12, color: "#9fa0a1" }}>{total} products — page {page} of {pages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => handlePage(page - 1)}
                style={{ background: "rgba(188,188,201,0.08)", borderRadius: 8, border: "1px solid rgba(188,188,201,0.15)", color: "#b3bade", padding: "4px 10px", cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.4 : 1 }}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled={page >= pages} onClick={() => handlePage(page + 1)}
                style={{ background: "rgba(188,188,201,0.08)", borderRadius: 8, border: "1px solid rgba(188,188,201,0.15)", color: "#b3bade", padding: "4px 10px", cursor: page >= pages ? "not-allowed" : "pointer", opacity: page >= pages ? 0.4 : 1 }}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
