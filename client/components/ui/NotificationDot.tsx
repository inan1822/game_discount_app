interface Props {
  events: number
  discounts: number
  size?: number
}

export default function NotificationDot({ events, discounts, size = 8 }: Props) {
  const hasEvents    = events > 0
  const hasDiscounts = discounts > 0
  const hasAny       = hasEvents || hasDiscounts

  if (!hasAny) return null

  if (hasEvents && hasDiscounts) {
    // Split dot: left half purple, right half green
    return (
      <span
        style={{
          display: "inline-block",
          width: size,
          height: size,
          borderRadius: "50%",
          background: `conic-gradient(#A855F7 0deg 180deg, #22C55E 180deg 360deg)`,
          flexShrink: 0,
        }}
        aria-label="New events and discounts"
      />
    )
  }

  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: hasEvents ? "#A855F7" : "#22C55E",
        flexShrink: 0,
      }}
      aria-label={hasEvents ? "New events" : "New discounts"}
    />
  )
}
