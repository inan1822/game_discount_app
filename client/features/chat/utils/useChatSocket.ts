"use client"

import { useEffect, useRef, useCallback } from "react"
import { io, Socket } from "socket.io-client"
import type { ChatMessageEvent, ChatReadEvent } from "@/shared/types/chat"

interface Handlers {
  enabled:     boolean
  onMessage:   (e: ChatMessageEvent) => void
  onRead:      (e: ChatReadEvent) => void
  onTyping:    (e: { conversationId: string; from: string; typing: boolean }) => void
  onConnect:   () => void
}

/**
 * Opens one socket.io connection (cookie-authed, same pattern as useUnreadCount)
 * and wires the chat events. Handlers are kept in a ref so the socket effect
 * runs once per session without re-subscribing on every render.
 */
export function useChatSocket(handlers: Handlers) {
  const ref = useRef(handlers)
  ref.current = handlers
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!handlers.enabled) return

    const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1$/, "") ?? "http://localhost:5000"
    const socket = io(apiBase, { withCredentials: true, transports: ["websocket", "polling"] })
    socketRef.current = socket

    socket.on("chat:message:new", (e: ChatMessageEvent) => ref.current.onMessage(e))
    socket.on("chat:read",        (e: ChatReadEvent)    => ref.current.onRead(e))
    socket.on("chat:typing",      (e: { conversationId: string; from: string; typing: boolean }) => ref.current.onTyping(e))
    // Fires on first connect AND every reconnect — refetch to recover missed messages.
    socket.on("connect", () => ref.current.onConnect())

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handlers.enabled])

  const emitTyping = useCallback((conversationId: string, to: string, typing: boolean) => {
    socketRef.current?.emit("chat:typing", { conversationId, to, typing })
  }, [])

  return { emitTyping }
}
