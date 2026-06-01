// ── Shared ───────────────────────────────────────────────────────────────────

export type OrderStatus = "pending" | "paid" | "delivered" | "cancelled" | "refunded"
export type EmailStatus = "pending" | "sent" | "failed"
export type ProductCategory = "gamekey" | "giftcard" | "subscription" | "dlc" | "currency"
export type ProductPlatform = "PC" | "PS5" | "Xbox" | "Switch" | "Other"
export type KeyStatus = "available" | "reserved" | "sold"

// ── Dashboard ────────────────────────────────────────────────────────────────

export interface OrderSummary {
  id: string
  customerEmail: string
  productName: string
  amount: number
  status: OrderStatus
  createdAt: string
}

export interface DashboardStats {
  revenue:      { total: number; deltaPct: number }
  ordersToday:  { count: number; deltaPct: number }
  activeUsers:  { count: number; deltaPct: number }
  lowStock:     { count: number; products: { id: string; name: string; stock: number }[] }
  revenueSeries: { date: string; revenue: number }[]
  recentOrders:  OrderSummary[]
  topProducts:   { id: string; name: string; sold: number; revenue: number }[]
}

// ── Orders ───────────────────────────────────────────────────────────────────

export interface OrderItem {
  productId:   string
  productName: string
  imageUrl?:   string | null
  keyId:       string | null
  quantity:    number
  unitPrice:   number
}

export interface Order {
  _id:            string
  customerEmail:  string
  customerUserId: string
  items:          OrderItem[]
  totalAmount:    number
  discountAmount: number
  promoCode:      string | null
  status:         OrderStatus
  paymentRef:     string
  emailStatus?:   EmailStatus
  emailSentAt?:   string | null
  keyAssignedAt?: string | null
  createdAt:      string
  updatedAt:      string
}

export interface OrdersPage {
  orders: Order[]
  total:  number
  page:   number
  pages:  number
}

// ── Products ─────────────────────────────────────────────────────────────────

export interface Product {
  _id:          string
  name:         string
  description:  string
  imageUrl:     string
  rawgGameId:   string | null
  rawgGameName: string | null
  platform:     ProductPlatform
  category:     ProductCategory
  price:        number
  isActive:     boolean
  isFeatured:   boolean
  totalKeys:    number
  availableKeys: number
  createdAt:    string
  updatedAt:    string
  // Only present on GET /:id
  keyStats?: { available: number; reserved: number; sold: number }
}

export interface ProductsPage {
  products: Product[]
  total:    number
  page:     number
  pages:    number
}

// ── GameKeys ─────────────────────────────────────────────────────────────────

export interface GameKey {
  _id:               string
  productId:         string
  code?:             string   // only present when reveal=1
  status:            KeyStatus
  reservedAt?:       string | null
  reservedByOrderId?: string | null
  soldAt?:           string | null
  soldInOrderId?:    string | null
  createdAt:         string
}

export interface KeysPage {
  keys:  GameKey[]
  total: number
  page:  number
  pages: number
}

export interface KeyImportResult {
  inserted:   number
  duplicates: number
}

// ── Users ────────────────────────────────────────────────────────────────────

export interface AdminUser {
  _id:         string
  name:        string
  email:       string
  role:        "user" | "admin"
  isVerified:  boolean
  isBanned:    boolean
  avatar?:     string
  lastSeenAt:  string
  createdAt:   string
}

export interface AdminUsersPage {
  users: AdminUser[]
  total: number
  page:  number
  pages: number
}

export interface AdminUserDetail {
  user:          AdminUser & { notificationPrefs?: { events: boolean; discounts: boolean }; isPrivate?: boolean }
  orderCount:    number
  recentOrders:  Order[]
  lifetimeSpend: number
}

// ── Promo Codes ──────────────────────────────────────────────────────────────

export type PromoType = "percent" | "fixed"

export interface PromoCode {
  _id:            string
  code:           string
  type:           PromoType
  value:          number
  minOrderAmount: number
  maxUses:        number | null
  usedCount:      number
  expiresAt:      string | null
  isActive:       boolean
  createdAt:      string
}

export interface PromoCodesPage {
  promos: PromoCode[]
  total:  number
  page:   number
  pages:  number
}

export interface PromoValidation {
  valid:          boolean
  promoId:        string
  code:           string
  type:           PromoType
  value:          number
  discount:       number
  originalPrice:  number
  finalAmount:    number
}

// ── Manual game links ──────────────────────────────────────────────────────────

export type ManualLinkPlatform = "pc" | "ps" | "xbox" | "switch" | "all"

export interface AdminManualLink {
  _id:               string
  rawgId:            string
  rawgName:          string
  label:             string
  url:               string
  platform:          ManualLinkPlatform
  price:             number | null
  storeIcon:         string
  note:              string
  subscriptionName:  string | null   // e.g. "PS Plus Extra", "Xbox Game Pass"
  discountExpiresAt: string | null   // ISO date — when the deal ends
  isLimitedStock:    boolean         // show "Limited" badge
  inStock:           boolean         // admin manually marks out-of-stock
  isActive:          boolean
  healthStatus:      "ok" | "dead" | "unknown"
  lastHealthCheck:   string | null
  aiTracking:        boolean
  aiTrackFailures:   number
  createdAt:         string
  updatedAt:         string
}

export interface CreateManualLinkInput {
  rawgId:            string
  rawgName?:         string
  label:             string
  url:               string
  platform:          ManualLinkPlatform
  price:             number | null
  storeIcon?:        string
  note?:             string
  subscriptionName?: string | null
  discountExpiresAt?: string | null
  isLimitedStock?:   boolean
  inStock?:          boolean
}

export type UpdateManualLinkInput = Partial<
  Pick<AdminManualLink,
    "label" | "url" | "platform" | "price" | "storeIcon" | "note" |
    "subscriptionName" | "discountExpiresAt" | "isLimitedStock" | "inStock" | "isActive" |
    "aiTracking" | "healthStatus" | "aiTrackFailures"
  >
>

// ── Broadcast ────────────────────────────────────────────────────────────────

export interface BroadcastHistory {
  title:      string
  body:       string
  recipients: number
  sentAt:     string
}

// ── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsData {
  period: number
  revenue: {
    total:  number
    series: { date: string; revenue: number }[]
  }
  orders: {
    total:    number
    byStatus: Record<string, number>
    series:   { date: string; count: number }[]
  }
  users: {
    newTotal: number
    series:   { date: string; count: number }[]
  }
  topProducts:       { id: string; name: string; sold: number; revenue: number }[]
  categoryBreakdown: { category: string; revenue: number; count: number }[]
  avgOrderValue:     number
}

// ── Socket ───────────────────────────────────────────────────────────────────

export interface NewOrderEvent {
  id:            string
  amount:        number
  customerEmail: string
  productCount:  number
  createdAt:     string
}
