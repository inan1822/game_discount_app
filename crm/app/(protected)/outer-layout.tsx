import PageBackground from "@/components/ui/PageBackground"

// Outer /admin layout — same animated gradient + SVG overlay used on every
// other page. All admin content sits at z-index >= 3 (see [[feedback-admin-design-system]]).
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: "#1E2532", color: "#fff" }}
    >
      <PageBackground />
      <div className="relative" style={{ zIndex: 3 }}>
        {children}
      </div>
    </div>
  )
}
