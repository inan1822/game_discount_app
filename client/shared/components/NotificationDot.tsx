interface Props {
  events: number
  discounts: number
  messages?: number
  size?: number
}

/**
 * Shows up to 3 separate dots — one per category with unread items.
 * Events = purple, Discounts = green, Messages = blue.
 * Only dots for categories that actually have unread are rendered.
 */
export default function NotificationDot({ events, discounts, messages = 0, size = 8 }: Props) {
  const hasEvents    = events > 0
  const hasDiscounts = discounts > 0
  const hasMessages  = messages > 0

  if (!hasEvents && !hasDiscounts && !hasMessages) return null

  const dot = (color: string, label: string) => (
    <span
      key={label}
      aria-label={label}
      style={{
        display:      "inline-block",
        width:        size,
        height:       size,
        borderRadius: "50%",
        background:   color,
        flexShrink:   0,
      }}
    />
  )

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
      {hasEvents    && dot("#A855F7", "New events")}
      {hasDiscounts && dot("#22C55E", "New discounts")}
      {hasMessages  && dot("#6475D1", "New messages")}
    </span>
  )
}
