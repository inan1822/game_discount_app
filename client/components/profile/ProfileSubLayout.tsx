"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

interface Props {
  title: string
  children: React.ReactNode
  backHref?: string
}

// Inner content shell for profile sub-pages. The outer sidebar + page background
// are provided by (app)/layout.tsx — do NOT render another sidebar here (the
// design system's "AppSidebar is the single NAV" rule forbids duplication).
export default function ProfileSubLayout({ title, children, backHref = "/profile" }: Props) {
  const router = useRouter()

  return (
    <div className="flex-1 min-w-0 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      <div className="max-w-lg mx-auto px-8 py-10">
        {/* Back button — glass per design system (60% opacity, blur(6px), radius 10) */}
        <button
          onClick={() => router.push(backHref)}
          className="flex items-center gap-2 mb-6 text-[13px] transition-colors hover:text-white"
          style={{
            background:           "rgba(28,30,42,0.60)",
            backdropFilter:       "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            border:               "1px solid rgba(255,255,255,0.06)",
            borderRadius:         10,
            padding:              "6px 12px",
            color:                "#b3bade",
            cursor:               "pointer",
          }}
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <h1 className="text-white text-2xl font-bold mb-6">{title}</h1>

        {children}
      </div>
    </div>
  )
}
