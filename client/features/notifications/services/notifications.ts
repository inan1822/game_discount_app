import api from "@/shared/services/axios"
import type { NotificationPage, UnreadByType } from "@/shared/types/notification"

export async function getNotifications(limit = 20, before?: string): Promise<NotificationPage> {
  const params: Record<string, string | number> = { limit }
  if (before) params.before = before
  const { data } = await api.get("/notifications", { params })
  return data.data as NotificationPage
}

export async function getUnreadCount(): Promise<UnreadByType> {
  const { data } = await api.get("/notifications/unread-count")
  return data.data as UnreadByType
}

export async function markRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`)
}

export async function markAllRead(): Promise<void> {
  await api.patch("/notifications/read-all")
}

export async function deleteNotification(id: string): Promise<void> {
  await api.delete(`/notifications/${id}`)
}

export async function seedNotification(type: "event" | "discount" = "discount"): Promise<void> {
  await api.post("/notifications/dev/seed", { type })
}
