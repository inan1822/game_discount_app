"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-toastify"
import { Download } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import ProfileSubLayout from "@/components/profile/ProfileSubLayout"
import { exportMyData } from "@/lib/api/support"

const cardStyle = {
  background: "rgba(28,30,42,0.70)",
  border: "1px solid rgba(255,255,255,0.05)",
  borderRadius: 14,
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
} as const

export default function ExportPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login")
  }, [isLoading, user, router])

  const handleExport = async () => {
    setDownloading(true)
    try {
      await exportMyData()
      toast.success("Download started")
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 429) {
        toast.error("Data export is limited to once per day.")
      } else {
        toast.error("Failed to export data. Please try again.")
      }
    } finally {
      setDownloading(false)
    }
  }

  if (isLoading || !user) return null

  return (
    <ProfileSubLayout title="Export My Data" backHref="/profile">
      <div style={cardStyle} className="p-6 space-y-5">
        <div>
          <h2 className="text-[15px] font-semibold text-white mb-2">What's included</h2>
          <ul className="space-y-1.5">
            {[
              "Your profile — name, email, avatar, role, created date",
              "Your wishlist — all saved games with cover and slug",
              "Your notifications — title, type, read status (last 30 days)",
            ].map(item => (
              <li key={item} className="flex items-start gap-2 text-[12px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                <span className="mt-0.5 flex-shrink-0" style={{ color: "#44d62c" }}>✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div
          className="rounded-[10px] px-4 py-3 text-[12px]"
          style={{ background: "rgba(100,117,209,0.08)", border: "1px solid rgba(100,117,209,0.15)", color: "rgba(255,255,255,0.5)" }}
        >
          The file downloads as <code className="text-brand-blue">dislow-data-[id]-[date].json</code>.
          Export is limited to once per 24 hours.
        </div>

        <button
          onClick={handleExport}
          disabled={downloading}
          className="w-full flex items-center justify-center gap-2 py-3 text-[14px] font-semibold transition-opacity disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg,#AE3BD6,#6475D1)",
            borderRadius: 10,
            border: "none",
            color: "white",
            cursor: downloading ? "wait" : "pointer",
          }}
        >
          <Download size={16} />
          {downloading ? "Preparing…" : "Download My Data"}
        </button>
      </div>
    </ProfileSubLayout>
  )
}
