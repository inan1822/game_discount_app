import type { Socket } from "socket.io"
import { emitToUser } from "../../shared/socket/io.js"

/**
 * Per-connection chat handlers.
 *
 * Message delivery + read receipts are emitted server-side from chat.service
 * (via emitToUser) as the authoritative path. The socket only relays ephemeral
 * typing indicators, which are non-persisted and harmless to forward.
 */
export function registerChatHandlers(socket: Socket): void {
  const me = (socket.data.user as { id: string })?.id
  if (!me) return

  socket.on("chat:typing", (data: { conversationId?: string; to?: string; typing?: boolean }) => {
    if (!data?.to || !data?.conversationId) return
    emitToUser(data.to, "chat:typing", {
      conversationId: data.conversationId,
      from:           me,
      typing:         !!data.typing,
    })
  })
}
