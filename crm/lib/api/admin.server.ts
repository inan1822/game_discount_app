// SERVER-ONLY — imports next/headers. Never import this from a "use client" file.
import axios from "axios"
import { cookies } from "next/headers"
import type {
  DashboardStats, Order, OrdersPage,
  Product, ProductsPage, KeysPage,
  AdminUsersPage, AdminUserDetail,
  PromoCodesPage, BroadcastHistory,
} from "@/types/admin"
import type { User } from "@/types/user"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// ── RSC helper: forward the httpOnly dislow_token cookie ────────────────────
async function adminAuthHeader(): Promise<Record<string, string>> {
  const jar = await cookies()
  const token = jar.get("dislow_token")?.value
  if (!token) return {}
  return { Cookie: `dislow_token=${token}` }
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function fetchAdminMe(): Promise<User | null> {
  try {
    const headers = await adminAuthHeader()
    if (!headers.Cookie) return null
    const { data } = await axios.get(`${API_URL}/api/v1/auth/me`, { headers })
    return (data?.data ?? null) as User | null
  } catch {
    return null
  }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const headers = await adminAuthHeader()
  const { data } = await axios.get(`${API_URL}/api/v1/admin/dashboard/stats`, { headers })
  return (data?.data ?? data) as DashboardStats
}

// ── Orders — RSC fetchers ─────────────────────────────────────────────────────

export async function fetchOrders(params?: {
  page?: number; limit?: number; status?: string
  search?: string; from?: string; to?: string
}): Promise<OrdersPage> {
  const headers = await adminAuthHeader()
  const qs = new URLSearchParams()
  if (params?.page)   qs.set("page",   String(params.page))
  if (params?.limit)  qs.set("limit",  String(params.limit))
  if (params?.status) qs.set("status", params.status)
  if (params?.search) qs.set("search", params.search)
  if (params?.from)   qs.set("from",   params.from)
  if (params?.to)     qs.set("to",     params.to)
  const { data } = await axios.get(`${API_URL}/api/v1/admin/orders?${qs}`, { headers })
  return (data?.data ?? data) as OrdersPage
}

export async function fetchOrder(id: string): Promise<Order | null> {
  try {
    const headers = await adminAuthHeader()
    const { data } = await axios.get(`${API_URL}/api/v1/admin/orders/${id}`, { headers })
    return (data?.data ?? null) as Order | null
  } catch {
    return null
  }
}

// ── Products — RSC fetchers ───────────────────────────────────────────────────

export async function fetchProducts(params?: {
  page?: number; limit?: number; search?: string
  category?: string; platform?: string; isActive?: boolean
}): Promise<ProductsPage> {
  const headers = await adminAuthHeader()
  const qs = new URLSearchParams()
  if (params?.page)     qs.set("page",     String(params.page))
  if (params?.limit)    qs.set("limit",    String(params.limit))
  if (params?.search)   qs.set("search",   params.search)
  if (params?.category) qs.set("category", params.category)
  if (params?.platform) qs.set("platform", params.platform)
  if (params?.isActive !== undefined) qs.set("isActive", String(params.isActive))
  const { data } = await axios.get(`${API_URL}/api/v1/admin/products?${qs}`, { headers })
  return (data?.data ?? data) as ProductsPage
}

export async function fetchProduct(id: string): Promise<Product | null> {
  try {
    const headers = await adminAuthHeader()
    const { data } = await axios.get(`${API_URL}/api/v1/admin/products/${id}`, { headers })
    return (data?.data ?? null) as Product | null
  } catch {
    return null
  }
}

export async function fetchProductKeys(productId: string, params?: {
  page?: number; limit?: number; status?: string; reveal?: boolean
}): Promise<KeysPage> {
  const headers = await adminAuthHeader()
  const qs = new URLSearchParams()
  if (params?.page)   qs.set("page",   String(params.page))
  if (params?.limit)  qs.set("limit",  String(params.limit))
  if (params?.status) qs.set("status", params.status)
  if (params?.reveal) qs.set("reveal", "1")
  const { data } = await axios.get(
    `${API_URL}/api/v1/admin/products/${productId}/keys?${qs}`,
    { headers }
  )
  return (data?.data ?? data) as KeysPage
}

// ── Users — RSC fetchers ──────────────────────────────────────────────────────

export async function fetchAdminUsers(params?: {
  page?: number; limit?: number; search?: string
  role?: string; banned?: string
}): Promise<AdminUsersPage> {
  try {
    const headers = await adminAuthHeader()
    const qs = new URLSearchParams()
    if (params?.page)   qs.set("page",   String(params.page))
    if (params?.limit)  qs.set("limit",  String(params.limit))
    if (params?.search) qs.set("search", params.search)
    if (params?.role)   qs.set("role",   params.role)
    if (params?.banned) qs.set("banned", params.banned)
    const { data } = await axios.get(`${API_URL}/api/v1/admin/users?${qs}`, { headers })
    return (data?.data ?? data) as AdminUsersPage
  } catch {
    return { users: [], total: 0, page: 1, pages: 0 }
  }
}

export async function fetchAdminUser(id: string): Promise<AdminUserDetail | null> {
  try {
    const headers = await adminAuthHeader()
    const { data } = await axios.get(`${API_URL}/api/v1/admin/users/${id}`, { headers })
    return (data?.data ?? data) as AdminUserDetail
  } catch {
    return null
  }
}

// ── Promos + Broadcast — RSC fetchers ────────────────────────────────────────

export async function fetchServerPromos(): Promise<PromoCodesPage> {
  const headers = await adminAuthHeader()
  const { data } = await axios.get(`${API_URL}/api/v1/admin/promos`, { headers })
  return (data?.data ?? data) as PromoCodesPage
}

export async function fetchServerBroadcastHistory(): Promise<BroadcastHistory[]> {
  try {
    const headers = await adminAuthHeader()
    const { data } = await axios.get(`${API_URL}/api/v1/admin/broadcast/history`, { headers })
    return ((data?.data ?? data).history ?? []) as BroadcastHistory[]
  } catch {
    return []
  }
}
