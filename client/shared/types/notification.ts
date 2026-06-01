export interface Notification {
  _id: string
  userId: string
  type: "event" | "discount"
  title: string
  body: string
  gameId: number | null
  gameSlug: string | null
  link: string | null
  read: boolean
  createdAt: string
}

export interface UnreadByType {
  events: number
  discounts: number
  total: number
}

export interface NotificationPage {
  items: Notification[]
  hasMore: boolean
}
