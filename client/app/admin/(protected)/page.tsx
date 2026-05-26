import { Suspense } from "react"
import { DashboardContent } from "./DashboardContent"
import { DashboardSkeleton } from "@/components/admin/DashboardSkeleton"

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: "#9fa0a1", marginTop: 4 }}>Overview of store activity</p>
      </header>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}
