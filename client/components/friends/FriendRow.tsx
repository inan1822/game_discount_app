"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import Avatar from "./Avatar"

interface Props {
  id: string
  displayName: string
  avatarUrl: string | null
  online?: boolean
  meta?: string
  actions?: React.ReactNode
  href?: string
}

const cardStyle = {
  background: "rgba(28,30,42,0.70)",
  border: "1px solid rgba(31,37,57,0.6)",
  borderRadius: 10,
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
} as const

export default function FriendRow({
  id,
  displayName,
  avatarUrl,
  online = false,
  meta,
  actions,
  href,
}: Props) {
  const target = href ?? `/friends/${id}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-center gap-3 px-4 py-3"
      style={cardStyle}
    >
      <Link
        href={target}
        className="flex items-center gap-3 flex-1 min-w-0"
        style={{ color: "inherit", textDecoration: "none" }}
      >
        <Avatar name={displayName} url={avatarUrl} online={online} />
        <div className="flex flex-col min-w-0">
          <span className="text-white text-[14px] font-semibold truncate">{displayName}</span>
          {meta && (
            <span className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
              {meta}
            </span>
          )}
        </div>
      </Link>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </motion.div>
  )
}

// Common button styles for actions
export const ActionButton = ({
  children,
  onClick,
  variant = "default",
  disabled,
  ariaLabel,
  style: extraStyle,
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: "default" | "primary" | "danger" | "muted"
  disabled?: boolean
  ariaLabel?: string
  style?: React.CSSProperties
}) => {
  const colors = {
    default: { bg: "rgba(255,255,255,0.06)", fg: "rgba(255,255,255,0.85)" },
    primary: { bg: "rgba(100,117,209,0.20)", fg: "#6475D1" },
    danger:  { bg: "rgba(239,68,68,0.18)",   fg: "#ef4444" },
    muted:   { bg: "rgba(255,255,255,0.04)", fg: "rgba(255,255,255,0.4)" },
  }[variant]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="text-[12px] font-medium px-3 py-1.5 transition-opacity"
      style={{
        background: colors.bg,
        color: colors.fg,
        borderRadius: 8,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        ...extraStyle,
      }}
    >
      {children}
    </button>
  )
}
