import { fetchAdminUser } from "@/lib/api/admin.server"
import { UserDetail } from "@/components/admin/UserDetail"
import { notFound } from "next/navigation"

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminUserDetailPage({ params }: Props) {
  const { id } = await params
  const detail = await fetchAdminUser(id)
  if (!detail) notFound()

  return (
    <div>
      <UserDetail initial={detail} />
    </div>
  )
}
