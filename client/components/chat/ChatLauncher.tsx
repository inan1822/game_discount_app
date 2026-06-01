"use client"

import { MessageCircle } from "@/shared/icons"
import { useChat } from "@/features/chat/state/ChatContext"
import ChatWindow from "./ChatWindow"

/**
 * Floating launcher bubble (bottom-right) + the chat window itself.
 * Mounted once in (app)/layout so it persists across route changes.
 */
export default function ChatLauncher() {
  const { myId, windowOpen, toggleWindow, totalUnread } = useChat()

  // Hide entirely for guests (the home page is public but inside the (app) group).
  if (!myId) return null

  return (
    <>
      {!windowOpen && (
        <button
          onClick={toggleWindow}
          style={{
            position: "fixed", right: 24, bottom: 24, zIndex: 1999,
            width: 54, height: 54, borderRadius: "50%",
            background: "#6475D1", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 24px rgba(100,117,209,0.45)", color: "#fff",
          }}
          aria-label="Open messages"
        >
          <MessageCircle className="w-6 h-6" />
          {totalUnread > 0 && (
            <span style={{
              position: "absolute", top: -2, right: -2,
              minWidth: 20, height: 20, padding: "0 5px", borderRadius: 999,
              background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 700,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              border: "2px solid #12131a",
            }}>
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </button>
      )}
      <ChatWindow />
    </>
  )
}
