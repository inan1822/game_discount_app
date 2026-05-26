import { redirect } from "next/navigation"
import { fetchAdminMe } from "@/lib/api/admin.server"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { IdleTimeoutProvider } from "@/components/admin/IdleTimeoutProvider"
import { OrderNotifications } from "@/components/admin/OrderNotifications"

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  // Authoritative role check — the proxy.ts redirect is optimistic.
  const user = await fetchAdminMe()
  if (!user || user.role !== "admin") {
    redirect("/login")
  }

  return (
    <IdleTimeoutProvider>
      <div className="flex min-h-screen">
        <AdminSidebar />
        {/* 20px gap between sidebar right edge and content — per CLAUDE.md desktop spacing rule */}
        <main className="flex-1 pt-16 md:pt-6 px-4 md:px-6">
          <OrderNotifications />
          {children}
        </main>
      </div>
    </IdleTimeoutProvider>
  )
}
