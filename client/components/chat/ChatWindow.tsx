"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useMotionValue, useDragControls } from "framer-motion"
import { X, ChevronLeft } from "lucide-react"
import Avatar from "@/components/friends/Avatar"
import { useChat } from "@/context/ChatContext"
import ConversationList from "./ConversationList"
import ChatThread from "./ChatThread"

const MIN_W = 320, MIN_H = 380, MAX_W = 560
const STORAGE_KEY = "dislow_chat_window"
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const maxH = () => (typeof window !== "undefined" ? Math.min(760, window.innerHeight - 40) : 760)

export default function ChatWindow() {
  const { windowOpen, view, activeOther, backToList, closeWindow } = useChat()

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const dragControls = useDragControls()
  const [size, setSize] = useState({ width: 380, height: 560 })
  const [constraints, setConstraints] = useState({ left: 0, top: 0, right: 0, bottom: 0 })
  const ready = useRef(false)

  // Restore persisted position/size (or default to bottom-right) once mounted.
  useEffect(() => {
    if (ready.current) return
    ready.current = true
    const vw = window.innerWidth, vh = window.innerHeight
    let w = 380, h = clamp(560, MIN_H, maxH())
    let px = vw - w - 24, py = vh - h - 24
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")
      if (saved) {
        w  = clamp(saved.width  ?? w, MIN_W, MAX_W)
        h  = clamp(saved.height ?? h, MIN_H, maxH())
        px = saved.x ?? px
        py = saved.y ?? py
      }
    } catch { /* ignore */ }
    setSize({ width: w, height: h })
    x.set(clamp(px, 0, Math.max(0, vw - w)))
    y.set(clamp(py, 0, Math.max(0, vh - h)))
  }, [x, y])

  // Keep constraints in sync with size + viewport; re-clamp position on shrink.
  useEffect(() => {
    function recompute() {
      const vw = window.innerWidth, vh = window.innerHeight
      setConstraints({ left: 0, top: 0, right: Math.max(0, vw - size.width), bottom: Math.max(0, vh - size.height) })
      x.set(clamp(x.get(), 0, Math.max(0, vw - size.width)))
      y.set(clamp(y.get(), 0, Math.max(0, vh - size.height)))
    }
    recompute()
    window.addEventListener("resize", recompute)
    return () => window.removeEventListener("resize", recompute)
  }, [size, x, y])

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: x.get(), y: y.get(), width: size.width, height: size.height }))
    } catch { /* ignore */ }
  }

  function startResize(e: React.PointerEvent) {
    e.preventDefault(); e.stopPropagation()
    const sx = e.clientX, sy = e.clientY
    const sw = size.width, sh = size.height
    function move(ev: PointerEvent) {
      setSize({
        width:  clamp(sw + (ev.clientX - sx), MIN_W, MAX_W),
        height: clamp(sh + (ev.clientY - sy), MIN_H, maxH()),
      })
    }
    function up() {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      persist()
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  if (!windowOpen) return null

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragConstraints={constraints}
      onDragEnd={persist}
      style={{
        position: "fixed", left: 0, top: 0, x, y, zIndex: 2000,
        width: size.width, height: size.height,
        background: "rgba(28,30,42,0.92)",
        backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
        border: "1px solid rgba(31,37,57,0.8)", borderRadius: 14,
        boxShadow: "0 16px 48px rgba(0,0,0,0.55)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}
    >
      {/* Adaptive header = drag handle */}
      <div
        onPointerDown={e => dragControls.start(e)}
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
          borderBottom: "1px solid rgba(31,37,57,0.6)", flexShrink: 0,
          cursor: "grab", userSelect: "none",
        }}
      >
        {view === "thread" ? (
          <>
            <button
              onClick={backToList}
              onPointerDown={e => e.stopPropagation()}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#9fa0a1", padding: 2, display: "flex" }}
              aria-label="Back to conversations"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {activeOther && <Avatar name={activeOther.name} url={activeOther.avatar} online={activeOther.isOnline} size={30} />}
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ color: "#fff", fontSize: 14, fontWeight: 700, lineHeight: 1.1 }} className="truncate">
                {activeOther?.name ?? "Chat"}
              </p>
              <p style={{ color: activeOther?.isOnline ? "#44d62c" : "#9fa0a1", fontSize: 11 }}>
                {activeOther?.isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </>
        ) : (
          <p style={{ color: "#fff", fontSize: 15, fontWeight: 700, flex: 1 }}>Messages</p>
        )}
        <button
          onClick={closeWindow}
          onPointerDown={e => e.stopPropagation()}
          style={{
            background: "rgba(188,188,201,0.08)", border: "none", borderRadius: 8,
            padding: 6, cursor: "pointer", color: "#9fa0a1", display: "flex", flexShrink: 0,
          }}
          aria-label="Close chat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {view === "thread" ? <ChatThread /> : <ConversationList />}
      </div>

      {/* Resize grip (bottom-right) */}
      <div
        onPointerDown={startResize}
        style={{
          position: "absolute", right: 2, bottom: 2, width: 16, height: 16,
          cursor: "nwse-resize", zIndex: 5,
          background: "linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.25) 50%)",
          borderRadius: "0 0 6px 0",
        }}
        aria-label="Resize"
      />
    </motion.div>
  )
}
