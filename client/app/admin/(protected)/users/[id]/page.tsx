import { fetchAdminUser } from "@/lib/api/admin.server"
import { UserDetail } from "@/components/admin/UserDetail"
import { SectionHeading } from "@/shared/components/SectionHeading"
import { notFound } from "next/navigation"

const PAGE: React.CSSProperties = {
  width: "min(calc(100% - 192px), 1600px)",
  marginInline: "auto",
  paddingBlock: 40,
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminUserDetailPage({ params }: Props) {
  const { id } = await params
  const detail = await fetchAdminUser(id)
  if (!detail) notFound()

  return (
    <div style={PAGE}>
      <SectionHeading title="User Detail" />
      <UserDetail initial={detail} />
    </div>
  )
}
