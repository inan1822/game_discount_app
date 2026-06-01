import { Suspense } from "react"
import { DashboardContent } from "./DashboardContent"
import { DashboardSkeleton } from "@/components/admin/DashboardSkeleton"
import { SectionHeading } from "@/shared/components/SectionHeading"

const PAGE: React.CSSProperties = {
  width: "min(calc(100% - 192px), 1600px)",
  marginInline: "auto",
  paddingBlock: 40,
}

export default function AdminDashboardPage() {
  return (
    <div style={PAGE}>
      <SectionHeading title="Dashboard" />
      <p style={{ fontSize: 13, color: "#9fa0a1", marginTop: -8, marginBottom: 20 }}>
        Overview of store activity
      </p>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}
