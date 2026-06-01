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
      {/* Definite-height shell (like the user-mode layout) so the glass sidebar
          fills the full viewport and the content column scrolls internally. */}
      <div className="flex h-screen overflow-hidden">
        <AdminSidebar />
        {/* Horizontal gutters + 1600px cap are baked into each page's width
            formula (min(calc(100% - 192px), 1600px)) — don't double up here.
            pt-14 only clears the mobile hamburger; desktop spacing comes from
            each page's paddingBlock. */}
        <main
          className="flex-1 min-w-0 h-full overflow-y-auto pt-14 md:pt-0"
          style={{ scrollbarWidth: "none" }}
        >
          <OrderNotifications />
          {children}
        </main>
      </div>
    </IdleTimeoutProvider>
  )
}
