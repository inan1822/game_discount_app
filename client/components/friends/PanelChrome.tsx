export function GroupHeader({
  label, count, color,
}: { label: string; count: number; color: string }) {
  return (
    <p
      className="text-[10px] font-bold tracking-widest mt-2 mb-1 px-1"
      style={{ color }}
    >
      {label.toUpperCase()} — {count}
    </p>
  )
}

export function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 animate-pulse"
          style={{
            background: "rgba(28,30,42,0.50)",
            border: "1px solid rgba(31,37,57,0.6)",
            borderRadius: 10,
          }}
        >
          <div className="rounded-full" style={{ width: 44, height: 44, background: "rgba(255,255,255,0.06)" }} />
          <div className="flex flex-col gap-2 flex-1">
            <div style={{ width: 120, height: 12, background: "rgba(255,255,255,0.06)", borderRadius: 6 }} />
            <div style={{ width: 200, height: 10, background: "rgba(255,255,255,0.04)", borderRadius: 6 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center py-14 px-4"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px dashed rgba(31,37,57,0.6)",
        borderRadius: 10,
      }}
    >
      <p className="text-[14px] text-white font-semibold mb-1">{title}</p>
      {hint && <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>{hint}</p>}
    </div>
  )
}
