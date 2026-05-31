export interface ChatParticipant {
  _id:      string
  name:     string
  avatar:   string | null
  isOnline: boolean
}

export interface ChatMessage {
  _id:            string
  conversationId: string
  senderId:       string
  recipientId:    string
  body:           string
  read:           boolean
  createdAt:      string
  // ─ client-only (optimistic send) ─
  clientTempId?:  string
  pending?:       boolean
  failed?:        boolean
}

export interface ChatConversation {
  _id:         string
  other:       ChatParticipant
  lastMessage: { body: string; senderId: string; createdAt: string } | null
  unread:      number
  updatedAt:   string
}

/** Relationship + remaining daily quota toward the other user. */
export interface ChatQuota {
  relationship: string
  isMutual:     boolean
  remaining:    number | null   // null = unlimited (mutual friends)
}

/** Payload of the `chat:message:new` socket event. */
export interface ChatMessageEvent {
  message:        ChatMessage
  conversationId: string
  clientTempId?:  string
  remaining:      number | null
}

/** Payload of the `chat:read` socket event. */
export interface ChatReadEvent {
  conversationId: string
  by:             string
  at:             string
}
