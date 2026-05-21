"use client"

const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 })

interface StatsRowProps {
  following: number
  followers: number
  favorites: number
  loading?: boolean
}

export default function StatsRow({ following, followers, favorites, loading }: StatsRowProps) {
  const items: Array<{ label: string; value: number }> = [
    { label: "Following", value: following },
    { label: "Followers", value: followers },
    { label: "Favorites", value: favorites },
  ]

  return (
    <div
      className="grid grid-cols-3"
      style={{
        background: "rgba(28,30,42,0.70)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 14,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      {items.map((item, i) => (
        <div
          key={item.label}
          className="flex flex-col items-center justify-center py-4"
          style={{
            borderLeft: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <span className="text-2xl font-bold text-white">
            {loading ? "—" : compact.format(item.value)}
          </span>
          <span
            className="text-[10px] tracking-widest uppercase mt-1"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}
