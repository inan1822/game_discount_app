"use client"

import { useState } from "react"

interface Props {
  label: string
  description: string
  checked: boolean
  accentColor: string   // e.g. "#AE3BD6" or "#44d62c"
  onChange: (next: boolean) => Promise<void>
}

export default function PreferenceToggle({ label, description, checked, accentColor, onChange }: Props) {
  const [busy, setBusy] = useState(false)
  const [optimistic, setOptimistic] = useState(checked)

  // Keep in sync if parent re-renders with a new value (e.g. after re-fetch)
  if (checked !== optimistic && !busy) setOptimistic(checked)

  const toggle = async () => {
    if (busy) return
    const next = !optimistic
    setOptimistic(next)
    setBusy(true)
    try {
      await onChange(next)
    } catch {
      setOptimistic(!next) // revert on failure
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className="w-full flex items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-white/[0.03] disabled:opacity-60"
      style={{ background: "transparent", border: "none", cursor: "pointer" }}
    >
      {/* Color dot indicator */}
      <span
        className="flex-shrink-0"
        style={{ width: 8, height: 8, borderRadius: "50%", background: accentColor }}
      />

      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-white">{label}</p>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{description}</p>
      </div>

      {/* Toggle pill */}
      <span
        className="flex-shrink-0 relative transition-all"
        style={{
          width: 38,
          height: 22,
          borderRadius: 999,
          background: optimistic ? accentColor : "rgba(255,255,255,0.12)",
          transition: "background 0.2s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: optimistic ? 19 : 3,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "white",
            transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        />
      </span>
    </button>
  )
}
