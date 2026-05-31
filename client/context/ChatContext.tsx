"use client"

import {
  createContext, useContext, useState, useCallback, useRef, useMemo, ReactNode,
} from "react"
import { useAuth } from "./AuthContext"
import { useChatSocket } from "@/hooks/useChatSocket"
import {
  listConversations as apiList,
  openConversation as apiOpen,
  getMessages as apiGetMessages,
  sendMessage as apiSend,
  markRead as apiMarkRead,
} from "@/lib/api/chat"
import type {
  ChatConversation, ChatMessage, ChatQuota, ChatMessageEvent, ChatReadEvent,
} from "@/types/chat"

interface ChatContextType {
  myId:           string | null
  conversations:  ChatConversation[]
  totalUnread:    number
  windowOpen:     boolean
  view:           "list" | "thread"
  activeId:       string | null
  activeOther:    ChatConversation["other"] | null
  activeMeta:     ChatQuota | null
  messages:       ChatMessage[]
  hasMore:        boolean
  loading:        boolean
  typingFrom:     string | null
  openChat:       (userId: string) => Promise<void>
  openConversation: (conv: ChatConversation) => Promise<void>
  refreshConversations: () => Promise<void>
  backToList:     () => void
  toggleWindow:   () => void
  closeWindow:    () => void
  sendMessage:    (text: string) => Promise<void>
  loadOlder:      () => Promise<void>
  notifyTyping:   () => void
}

const ChatContext = createContext<ChatContextType | null>(null)

/** Merge an incoming message into a list, deduping by real _id then clientTempId. */
function mergeMessage(list: ChatMessage[], message: ChatMessage, clientTempId?: string): ChatMessage[] {
  if (list.some(m => m._id === message._id)) return list
  if (clientTempId) {
    const idx = list.findIndex(m => m.clientTempId === clientTempId && m.pending)
    if (idx >= 0) {
      const copy = [...list]
      copy[idx] = message
      return copy
    }
  }
  return [...list, message]
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const myId = user?._id ?? null

  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [windowOpen,    setWindowOpen]    = useState(false)
  const [view,          setView]          = useState<"list" | "thread">("list")
  const [activeId,      setActiveId]      = useState<string | null>(null)
  const [activeOther,   setActiveOther]   = useState<ChatConversation["other"] | null>(null)
  const [activeMeta,    setActiveMeta]    = useState<ChatQuota | null>(null)
  const [messagesByConv, setMessagesByConv] = useState<Record<string, ChatMessage[]>>({})
  const [hasMoreByConv,  setHasMoreByConv]  = useState<Record<string, boolean>>({})
  const [loading,       setLoading]       = useState(false)
  const [typingFrom,    setTypingFrom]    = useState<string | null>(null)

  // Latest "viewing" snapshot for socket handlers (avoids stale closures).
  const viewingRef = useRef<{ open: boolean; view: string; activeId: string | null }>({
    open: false, view: "list", activeId: null,
  })
  viewingRef.current = { open: windowOpen, view, activeId }
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const emitTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const messages = activeId ? (messagesByConv[activeId] ?? []) : []
  const hasMore  = activeId ? (hasMoreByConv[activeId] ?? false) : false
  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unread ?? 0), 0),
    [conversations],
  )

  const refreshConversations = useCallback(async () => {
    try { setConversations(await apiList()) } catch { /* ignore */ }
  }, [])

  // ── Socket handlers ──────────────────────────────────────────────────────
  const onMessage = useCallback((e: ChatMessageEvent) => {
    const { message, conversationId, clientTempId, remaining } = e

    setMessagesByConv(prev => {
      // Only track threads we've already loaded; others load on open.
      if (!(conversationId in prev) && conversationId !== viewingRef.current.activeId) return prev
      return { ...prev, [conversationId]: mergeMessage(prev[conversationId] ?? [], message, clientTempId) }
    })

    // Update my live quota if this is my own outgoing echo in the active thread.
    if (myId && message.senderId === myId && conversationId === viewingRef.current.activeId) {
      setActiveMeta(m => (m && !m.isMutual ? { ...m, remaining } : m))
    }

    const viewing =
      viewingRef.current.open &&
      viewingRef.current.view === "thread" &&
      viewingRef.current.activeId === conversationId

    setConversations(prev => {
      const idx = prev.findIndex(c => c._id === conversationId)
      if (idx < 0) {
        // Unknown conversation (first message) — refetch the list.
        refreshConversations()
        return prev
      }
      const incomingToMe = !!myId && message.recipientId === myId
      const updated: ChatConversation = {
        ...prev[idx],
        lastMessage: { body: message.body, senderId: message.senderId, createdAt: message.createdAt },
        updatedAt:   message.createdAt,
        unread:      incomingToMe && !viewing ? (prev[idx].unread ?? 0) + 1 : prev[idx].unread ?? 0,
      }
      return [updated, ...prev.filter((_, i) => i !== idx)]
    })

    // If I'm looking at this thread, immediately mark read.
    if (viewing && myId && message.recipientId === myId) {
      apiMarkRead(conversationId).catch(() => {})
      setConversations(prev => prev.map(c => c._id === conversationId ? { ...c, unread: 0 } : c))
    }
  }, [myId, refreshConversations])

  const onRead = useCallback((e: ChatReadEvent) => {
    // The other side read my messages → flip my sent bubbles to read.
    setMessagesByConv(prev => {
      const list = prev[e.conversationId]
      if (!list) return prev
      return { ...prev, [e.conversationId]: list.map(m => m.senderId === myId ? { ...m, read: true } : m) }
    })
  }, [myId])

  const onTyping = useCallback((e: { conversationId: string; from: string; typing: boolean }) => {
    if (e.conversationId !== viewingRef.current.activeId) return
    if (typingTimer.current) clearTimeout(typingTimer.current)
    if (e.typing) {
      setTypingFrom(e.from)
      typingTimer.current = setTimeout(() => setTypingFrom(null), 4000)
    } else {
      setTypingFrom(null)
    }
  }, [])

  const onConnect = useCallback(() => {
    refreshConversations()
    const cid = viewingRef.current.activeId
    if (cid) apiGetMessages(cid).then(r => {
      setMessagesByConv(prev => ({ ...prev, [cid]: r.messages }))
      setHasMoreByConv(prev => ({ ...prev, [cid]: r.hasMore }))
    }).catch(() => {})
  }, [refreshConversations])

  const { emitTyping } = useChatSocket({
    enabled: !!myId, onMessage, onRead, onTyping, onConnect,
  })

  // ── Actions ──────────────────────────────────────────────────────────────
  const loadThread = useCallback(async (conv: ChatConversation) => {
    setActiveId(conv._id)
    setActiveOther(conv.other)
    setView("thread")
    setWindowOpen(true)
    setTypingFrom(null)
    setLoading(true)
    try {
      const { messages: msgs, hasMore: more } = await apiGetMessages(conv._id)
      setMessagesByConv(prev => ({ ...prev, [conv._id]: msgs }))
      setHasMoreByConv(prev => ({ ...prev, [conv._id]: more }))
      if (conv.unread > 0) {
        await apiMarkRead(conv._id)
        setConversations(prev => prev.map(c => c._id === conv._id ? { ...c, unread: 0 } : c))
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  const openChat = useCallback(async (userId: string) => {
    if (!userId || userId === myId) return
    setWindowOpen(true)
    setView("thread")
    setLoading(true)
    try {
      const { conversation, meta } = await apiOpen(userId)
      setActiveMeta(meta)
      // Ensure the conversation is in the list.
      setConversations(prev =>
        prev.some(c => c._id === conversation._id) ? prev : [conversation, ...prev],
      )
      await loadThread(conversation)
    } catch {
      setLoading(false)
    }
  }, [myId, loadThread])

  const openConversation = useCallback(async (conv: ChatConversation) => {
    // Fetch fresh quota meta for the banner.
    try {
      const { meta } = await apiOpen(conv.other._id)
      setActiveMeta(meta)
    } catch { setActiveMeta(null) }
    await loadThread(conv)
  }, [loadThread])

  const backToList     = useCallback(() => { setView("list"); refreshConversations() }, [refreshConversations])
  const closeWindow    = useCallback(() => setWindowOpen(false), [])
  const toggleWindow   = useCallback(() => {
    setWindowOpen(o => {
      const next = !o
      if (next) { setView("list"); refreshConversations() }
      return next
    })
  }, [refreshConversations])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || !activeId || !activeOther || !myId) return
    const clientTempId = (globalThis.crypto?.randomUUID?.() ?? `tmp_${Date.now()}_${Math.random()}`)
    const optimistic: ChatMessage = {
      _id: clientTempId, conversationId: activeId, senderId: myId, recipientId: activeOther._id,
      body: trimmed, read: false, createdAt: new Date().toISOString(), clientTempId, pending: true,
    }
    setMessagesByConv(prev => ({ ...prev, [activeId]: [...(prev[activeId] ?? []), optimistic] }))

    try {
      const res = await apiSend(activeOther._id, trimmed, clientTempId)
      setMessagesByConv(prev => ({
        ...prev, [activeId]: mergeMessage(prev[activeId] ?? [], res.message, clientTempId),
      }))
      setActiveMeta(m => (m && !m.isMutual ? { ...m, remaining: res.remaining } : m))
      setConversations(prev => {
        const idx = prev.findIndex(c => c._id === activeId)
        if (idx < 0) { refreshConversations(); return prev }
        const updated = { ...prev[idx], lastMessage: { body: trimmed, senderId: myId, createdAt: res.message.createdAt }, updatedAt: res.message.createdAt }
        return [updated, ...prev.filter((_, i) => i !== idx)]
      })
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      setMessagesByConv(prev => ({
        ...prev,
        [activeId]: (prev[activeId] ?? []).map(m =>
          m.clientTempId === clientTempId ? { ...m, pending: false, failed: true } : m),
      }))
      if (status === 429) setActiveMeta(m => (m ? { ...m, remaining: 0 } : m))
    }
  }, [activeId, activeOther, myId, refreshConversations])

  const loadOlder = useCallback(async () => {
    if (!activeId) return
    const current = messagesByConv[activeId] ?? []
    const oldest = current.find(m => !m.pending)
    if (!oldest) return
    try {
      const { messages: older, hasMore: more } = await apiGetMessages(activeId, oldest.createdAt)
      setMessagesByConv(prev => ({ ...prev, [activeId]: [...older, ...(prev[activeId] ?? [])] }))
      setHasMoreByConv(prev => ({ ...prev, [activeId]: more }))
    } catch { /* ignore */ }
  }, [activeId, messagesByConv])

  const notifyTyping = useCallback(() => {
    if (!activeId || !activeOther) return
    emitTyping(activeId, activeOther._id, true)
    if (emitTimer.current) clearTimeout(emitTimer.current)
    emitTimer.current = setTimeout(() => {
      if (activeId && activeOther) emitTyping(activeId, activeOther._id, false)
    }, 2500)
  }, [activeId, activeOther, emitTyping])

  const value: ChatContextType = {
    myId, conversations, totalUnread, windowOpen, view,
    activeId, activeOther, activeMeta, messages, hasMore, loading, typingFrom,
    openChat, openConversation, refreshConversations, backToList, toggleWindow, closeWindow,
    sendMessage, loadOlder, notifyTyping,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat(): ChatContextType {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error("useChat must be used within a ChatProvider")
  return ctx
}
