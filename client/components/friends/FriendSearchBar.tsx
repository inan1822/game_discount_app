"use client"

import { Search } from "lucide-react"

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export default function FriendSearchBar({ value, onChange, placeholder = "Search friends..." }: Props) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 mb-3"
      style={{
        background: "rgba(28,30,42,0.70)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 12,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <Search size={14} style={{ color: "rgba(255,255,255,0.4)" }} />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="flex-1 bg-transparent text-[13px] outline-none text-white placeholder:text-white/30"
      />
    </div>
  )
}
