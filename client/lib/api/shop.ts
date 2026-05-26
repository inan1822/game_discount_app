// Client-safe shop + checkout API — no next/headers.
import axios from "axios"
import type { Product, ProductsPage, Order, OrdersPage, PromoValidation } from "@/types/admin"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// ── Public store (no auth) ────────────────────────────────────────────────────

export async function fetchStoreProducts(params?: {
  page?: number; search?: string; category?: string; platform?: string
}): Promise<ProductsPage> {
  const qs = new URLSearchParams()
  if (params?.page)     qs.set("page",     String(params.page))
  if (params?.search)   qs.set("search",   params.search)
  if (params?.category) qs.set("category", params.category)
  if (params?.platform) qs.set("platform", params.platform)
  const { data } = await axios.get(`${API_URL}/api/v1/store/products?${qs}`)
  return (data?.data ?? data) as ProductsPage
}

export async function fetchStoreProduct(id: string): Promise<Product | null> {
  try {
    const { data } = await axios.get(`${API_URL}/api/v1/store/products/${id}`)
    return (data?.data ?? null) as Product | null
  } catch {
    return null
  }
}

export async function fetchStoreProductsByGame(rawgGameId: string): Promise<Product[]> {
  try {
    const { data } = await axios.get(`${API_URL}/api/v1/store/products/by-game/${rawgGameId}`)
    return ((data?.data?.products ?? data?.products ?? []) as Product[])
  } catch {
    return []
  }
}

// ── Checkout (auth required — cookie sent automatically) ──────────────────────

export async function validatePromo(code: string, productId: string): Promise<PromoValidation> {
  const { data } = await axios.post(
    `${API_URL}/api/v1/checkout/validate-promo`,
    { code, productId },
    { withCredentials: true }
  )
  return data as PromoValidation
}

export async function createCheckout(productId: string, promoCode?: string): Promise<{
  clientSecret:   string | null
  isFree:         boolean
  gameKey?:       string
  orderId:        string
  originalPrice:  number
  discountAmount: number
  finalPrice:     number
  promoCode:      string | null
}> {
  const { data } = await axios.post(
    `${API_URL}/api/v1/checkout`,
    { productId, promoCode: promoCode || undefined },
    { withCredentials: true }
  )
  return data.data
}

// ── My orders (auth required) ─────────────────────────────────────────────────

export async function fetchMyOrders(page = 1): Promise<OrdersPage> {
  const { data } = await axios.get(
    `${API_URL}/api/v1/checkout/orders?page=${page}`,
    { withCredentials: true }
  )
  return (data?.data ?? data) as OrdersPage
}
