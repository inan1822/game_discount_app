import { fetchAdminUsers } from "@/lib/api/admin.server"
import { UsersTable } from "@/components/admin/UsersTable"
import { Users } from "lucide-react"

interface Props {
  searchParams: Promise<{
    page?: string; role?: string; banned?: string; search?: string
  }>
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const sp = await searchParams
  const page   = parseInt(sp.page   || "1")
  const role   = sp.role   || ""
  const banned = sp.banned || ""
  const search = sp.search || ""

  const data = await fetchAdminUsers({
    page,
    role:   role   || undefined,
    banned: banned || undefined,
    search: search || undefined,
  })

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-3 mb-1">
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(100,117,209,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Users className="w-4 h-4" style={{ color: "#6475D1" }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>Users</h1>
        </div>
        <p style={{ color: "#9fa0a1", fontSize: 13, marginLeft: 48 }}>
          {data.total} registered user{data.total !== 1 ? "s" : ""}
        </p>
      </header>

      <UsersTable initial={data} />
    </div>
  )
}
