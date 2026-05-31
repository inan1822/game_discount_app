import { fetchAdminUsers } from "@/lib/api/admin.server"
import { UsersTable } from "@/components/admin/UsersTable"
import { SectionHeading } from "@/components/ui/SectionHeading"

const PAGE: React.CSSProperties = {
  width: "min(calc(100% - 192px), 1600px)",
  marginInline: "auto",
  paddingBlock: 40,
}

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
    <div style={PAGE}>
      <SectionHeading title="Users" />
      <p style={{ color: "#9fa0a1", fontSize: 13, marginTop: -8, marginBottom: 20 }}>
        {data.total} registered user{data.total !== 1 ? "s" : ""}
      </p>

      <UsersTable initial={data} />
    </div>
  )
}
