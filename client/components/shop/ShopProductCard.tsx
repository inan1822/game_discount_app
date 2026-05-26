"use client"
import Link from "next/link"
import type { Product } from "@/types/admin"

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

const CATEGORY_LABEL: Record<string, string> = {
  gamekey: "Game Key", giftcard: "Gift Card",
  subscription: "Subscription", dlc: "DLC", currency: "Currency",
}

export function ShopProductCard({ product }: { product: Product }) {
  const inStock = product.availableKeys > 0

  return (
    <Link
      href={product.rawgGameId ? `/game/${product.rawgGameId}` : `/shop/${product._id}`}
      style={{
        display: "block",
        background: "rgba(28,30,42,0.70)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid rgba(188,188,201,0.15)",
        borderRadius: 15,
        overflow: "hidden",
        textDecoration: "none",
        transition: "border-color 0.2s, transform 0.2s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "rgba(100,117,209,0.40)"
        e.currentTarget.style.transform = "translateY(-2px)"
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "rgba(188,188,201,0.15)"
        e.currentTarget.style.transform = "translateY(0)"
      }}
    >
      {/* Cover image */}
      <div style={{ position: "relative", height: 160, overflow: "hidden" }}>
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "rgba(100,117,209,0.10)" }} />
        )}

        {/* Out of stock overlay */}
        {!inStock && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{
              color: "#ef4444", fontSize: 12, fontWeight: 700,
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.40)",
              borderRadius: 999, padding: "4px 12px",
            }}>
              Out of Stock
            </span>
          </div>
        )}

        {/* Category badge */}
        <span style={{
          position: "absolute", top: 10, left: 10,
          background: "rgba(100,117,209,0.85)",
          color: "#fff", fontSize: 10, fontWeight: 700,
          borderRadius: 999, padding: "3px 10px",
        }}>
          {CATEGORY_LABEL[product.category] ?? product.category}
        </span>
      </div>

      {/* Info overlay */}
      <div style={{ padding: "14px 16px" }}>
        <p style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>
          {product.name}
        </p>

        {product.rawgGameName && product.rawgGameName !== product.name && (
          <p style={{ color: "#9fa0a1", fontSize: 11, marginBottom: 8 }}>
            {product.rawgGameName}
          </p>
        )}

        <div className="flex items-center justify-between">
          <span style={{ color: "#9fa0a1", fontSize: 12 }}>{product.platform}</span>
          <span style={{
            color: inStock ? "#44d62c" : "#9fa0a1",
            fontSize: 18, fontWeight: 800,
          }}>
            {currency.format(product.price)}
          </span>
        </div>
      </div>
    </Link>
  )
}
