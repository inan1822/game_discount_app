/**
 * (app) route-group layout — wraps every main-app page with the shared shell.
 *
 * Why this exists:
 *   In Next.js App Router, layouts ABOVE the page level stay mounted across
 *   route changes inside the same segment. That's what lets the AppSidebar
 *   (and its Limelight indicator) PERSIST when navigating between Home →
 *   Notifications → Search etc. — so the bar visibly slides between items
 *   instead of remounting and snapping to the new active position.
 *
 * The group name "(app)" is a Next.js route group: it organises pages without
 * affecting the URL. Public/auth/admin routes stay outside this group so they
 * don't inherit the sidebar shell.
 */

import PageBackground from "@/components/ui/PageBackground"
import AppSidebar     from "@/components/layout/AppSidebar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative w-screen h-screen overflow-hidden" style={{ background: "#1E2532" }}>
      <PageBackground />
      <div className="relative flex h-full" style={{ zIndex: 3 }}>
        {/* Sidebar — desktop only. Mobile pages handle their own chrome
            (BottomNav etc.) inside a md:hidden block. */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <div className="flex-1 min-w-0 h-full pt-4" style={{ scrollbarWidth: "none", overflowY: "auto", overflowX: "visible" }}>
          {children}
        </div>
      </div>
    </main>
  )
}
