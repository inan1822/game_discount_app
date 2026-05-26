// CLIENT-SAFE — no next/headers. Safe to import from "use client" components.
import axios from "axios"
import type {
  Order, OrderStatus, Product, KeyImportResult, AdminUser, AnalyticsData,
  PromoCode, PromoCodesPage, BroadcastHistory,
} from "@/types/admin"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// ── Orders ────────────────────────────────────────────────────────────────────

export function ordersExportUrl(params?: {
  status?: string; from?: string; to?: string
}): string {
  const qs = new URLSearchParams()
  if (params?.status) qs.set("status", params.status)
  if (params?.from)   qs.set("from",   params.from)
  if (params?.to)     qs.set("to",     params.to)
  const q = qs.toString()
  return `${API_URL}/api/v1/admin/orders/export${q ? "?" + q : ""}`
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  const { data } = await axios.patch(
    `${API_URL}/api/v1/admin/orders/${id}`,
    { status },
    { withCredentials: true }
  )
  return data.data as Order
}

export async function resendDeliveryEmail(id: string): Promise<{ emailStatus: string; emailSentAt: string }> {
  const { data } = await axios.post(
    `${API_URL}/api/v1/admin/orders/${id}/resend-email`,
    {},
    { withCredentials: true }
  )
  return data.data as { emailStatus: string; emailSentAt: string }
}

// ── Products ──────────────────────────────────────────────────────────────────

type ProductPayload = {
  name: string; description?: string; imageUrl?: string
  rawgGameId?: string | null; rawgGameName?: string | null
  platform: string; category: string; price: number; isActive?: boolean
}

export async function createProduct(payload: ProductPayload): Promise<Product> {
  const { data } = await axios.post(
    `${API_URL}/api/v1/admin/products`,
    payload,
    { withCredentials: true }
  )
  return data.data as Product
}

export async function updateProduct(id: string, payload: Partial<ProductPayload>): Promise<Product> {
  const { data } = await axios.put(
    `${API_URL}/api/v1/admin/products/${id}`,
    payload,
    { withCredentials: true }
  )
  return data.data as Product
}

export async function deleteProduct(id: string): Promise<void> {
  await axios.delete(`${API_URL}/api/v1/admin/products/${id}`, { withCredentials: true })
}

// ── Keys ──────────────────────────────────────────────────────────────────────

export async function importKeys(productId: string, codes: string[]): Promise<KeyImportResult> {
  const { data } = await axios.post(
    `${API_URL}/api/v1/admin/products/${productId}/keys`,
    { codes },
    { withCredentials: true }
  )
  return data.data as KeyImportResult
}

export function keysExportUrl(productId: string): string {
  return `${API_URL}/api/v1/admin/products/${productId}/keys?reveal=1&limit=200`
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function updateAdminUser(
  id: string,
  patch: { isBanned?: boolean; role?: "user" | "admin" }
): Promise<AdminUser> {
  const { data } = await axios.patch(
    `${API_URL}/api/v1/admin/users/${id}`,
    patch,
    { withCredentials: true }
  )
  return (data.data?.user ?? data.user) as AdminUser
}

export async function deleteAdminUser(id: string): Promise<void> {
  await axios.delete(`${API_URL}/api/v1/admin/users/${id}`, { withCredentials: true })
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export async function fetchAnalytics(period: 7 | 30 | 90 = 30): Promise<AnalyticsData> {
  const { data } = await axios.get(
    `${API_URL}/api/v1/admin/analytics?period=${period}`,
    { withCredentials: true }
  )
  return (data?.data ?? data) as AnalyticsData
}

// ── Promo codes ───────────────────────────────────────────────────────────────

export async function fetchPromos(page = 1): Promise<PromoCodesPage> {
  const { data } = await axios.get(
    `${API_URL}/api/v1/admin/promos?page=${page}`,
    { withCredentials: true }
  )
  return (data?.data ?? data) as PromoCodesPage
}

export async function createPromo(payload: {
  code: string; type: "percent" | "fixed"; value: number
  minOrderAmount?: number; maxUses?: number | null; expiresAt?: string | null
}): Promise<PromoCode> {
  const { data } = await axios.post(`${API_URL}/api/v1/admin/promos`, payload, { withCredentials: true })
  return (data?.data?.promo ?? data.promo) as PromoCode
}

export async function togglePromo(id: string, isActive: boolean): Promise<PromoCode> {
  const { data } = await axios.patch(
    `${API_URL}/api/v1/admin/promos/${id}`,
    { isActive },
    { withCredentials: true }
  )
  return (data?.data?.promo ?? data.promo) as PromoCode
}

export async function deletePromo(id: string): Promise<void> {
  await axios.delete(`${API_URL}/api/v1/admin/promos/${id}`, { withCredentials: true })
}

// ── Broadcast ─────────────────────────────────────────────────────────────────

export async function sendBroadcast(payload: {
  title: string; body: string
  type: "event" | "discount" | "announcement"
  target: "all" | "verified"
  sendEmail: boolean
}): Promise<{ sent: number; emailsSent: number }> {
  const { data } = await axios.post(`${API_URL}/api/v1/admin/broadcast`, payload, { withCredentials: true })
  return (data?.data ?? data) as { sent: number; emailsSent: number }
}

export async function fetchBroadcastHistory(): Promise<BroadcastHistory[]> {
  const { data } = await axios.get(`${API_URL}/api/v1/admin/broadcast/history`, { withCredentials: true })
  return ((data?.data ?? data).history ?? []) as BroadcastHistory[]
}
