import api from "./axios"
import type { ChatConversation, ChatMessage, ChatQuota } from "@/types/chat"

export async function listConversations(): Promise<ChatConversation[]> {
  const { data } = await api.get("/chat/conversations")
  return data.data as ChatConversation[]
}

/** Lazily get-or-create the 1:1 conversation with another user. */
export async function openConversation(
  withUserId: string,
): Promise<{ conversation: ChatConversation; meta: ChatQuota }> {
  const { data } = await api.post(`/chat/conversations/${withUserId}`)
  return data.data as { conversation: ChatConversation; meta: ChatQuota }
}

export async function getMessages(
  conversationId: string,
  before?: string,
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  const { data } = await api.get(`/chat/conversations/${conversationId}/messages`, {
    params: before ? { before } : undefined,
  })
  return data.data as { messages: ChatMessage[]; hasMore: boolean }
}

export async function sendMessage(
  withUserId: string,
  body: string,
  clientTempId: string,
): Promise<{ message: ChatMessage; conversationId: string; remaining: number | null }> {
  const { data } = await api.post(`/chat/conversations/${withUserId}/messages`, { body, clientTempId })
  return data.data as { message: ChatMessage; conversationId: string; remaining: number | null }
}

export async function markRead(conversationId: string): Promise<void> {
  await api.post(`/chat/conversations/${conversationId}/read`)
}
