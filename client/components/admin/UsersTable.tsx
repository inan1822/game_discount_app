"use client"
import { useState, useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Search, Shield, Ban, Trash2, ChevronLeft, ChevronRight, UserCheck } from "lucide-react"
import { updateAdminUser, deleteAdminUser } from "@/lib/api/admin.client"
import type { AdminUser, AdminUsersPage } from "@/shared/types/admin"

const ROLE_OPTS = [
  { value: "",      label: "All roles"  },
  { value: "user",  label: "Users"      },
  { value: "admin", label: "Admins"     },
]
const BANNED_OPTS = [
  { value: "",      label: "Any status" },
  { value: "false", label: "Active"     },
  { value: "true",  label: "Banned"     },
]

const INPUT: React.CSSProperties = {
  background: "#1c1e2a",
  border: "1px solid rgba(188,188,201,0.15)",
  borderRadius: 10,
  color: "#fff",
  fontSize: 13,
  padding: "7px 12px",
  outline: "none",
}

function Avatar({ user }: { user: AdminUser }) {
  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt=""
        style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
      />
    )
  }
  const initials = user.name.slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: 32, height: 32, borderRadius: "50%",
      background: "rgba(100,117,209,0.20)",
      border: "1px solid rgba(100,117,209,0.30)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, fontWeight: 700, color: "#6475D1", flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

interface Props {
  initial: AdminUsersPage
}

export function UsersTable({ initial }: Props) {
  const router     = useRouter()
  const pathname   = usePathname()
  const sp         = useSearchParams()
  const [, start]  = useTransition()

  const page   = parseInt(sp.get("page")   || "1")
  const role   = sp.get("role")   || ""
  const banned = sp.get("banned") || ""
  const search = sp.get("search") || ""

  const [searchInput, setSearchInput] = useState(search)
  const [users, setUsers]   = useState<AdminUser[]>(initial.users)
  const [total, setTotal]   = useState(initial.total)
  const [pages, setPages]   = useState(initial.pages)
  const [busy,  setBusy]    = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)

  function push(overrides: Record<string, string>) {
    const params = new URLSearchParams(sp.toString())
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) params.set(k, v); else params.delete(k)
    })
    params.set("page", "1")
    start(() => router.push(`${pathname}?${params}`))
  }

  async function handleBan(user: AdminUser) {
    setBusy(user._id)
    try {
      const updated = await updateAdminUser(user._id, { isBanned: !user.isBanned })
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, isBanned: updated.isBanned } : u))
    } catch { /* silent */ } finally { setBusy(null) }
  }

  async function handleDelete(id: string) {
    setBusy(id)
    try {
      await deleteAdminUser(id)
      setUsers(prev => prev.filter(u => u._id !== id))
      setTotal(t => t - 1)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg ?? "Cannot delete user")
    } finally {
      setBusy(null)
      setConfirm(null)
    }
  }

  const PANEL: React.CSSProperties = {
    background: "rgba(28,30,42,0.70)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    border: "1px solid rgba(188,188,201,0.15)",
    borderRadius: 10,
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div style={{ ...PANEL, padding: "12px 16px" }} className="flex flex-wrap gap-3 items-center">
        <form
          className="relative flex-1 min-w-[180px]"
          onSubmit={e => { e.preventDefault(); push({ search: searchInput }) }}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#9fa0a1" }} />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search name or email…"
            style={{ ...INPUT, paddingLeft: 32, width: "100%" }}
          />
        </form>

        <select
          value={role}
          onChange={e => push({ role: e.target.value })}
          style={{ ...INPUT, minWidth: 130, cursor: "pointer" }}
        >
          {ROLE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          value={banned}
          onChange={e => push({ banned: e.target.value })}
          style={{ ...INPUT, minWidth: 130, cursor: "pointer" }}
        >
          {BANNED_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <p style={{ color: "#9fa0a1", fontSize: 12, marginLeft: "auto" }}>
          {total} user{total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Table */}
      <div style={PANEL} className="overflow-x-auto">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(188,188,201,0.10)" }}>
              {["User", "Role", "Status", "Joined", "Last seen", "Actions"].map(h => (
                <th key={h} style={{
                  padding: "10px 16px", textAlign: "left",
                  fontSize: 13, fontWeight: 700, color: "#9fa0a1",
                  letterSpacing: "0.1em", textTransform: "uppercase",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "40px 16px", textAlign: "center", color: "#9fa0a1", fontSize: 13 }}>
                  No users match your filters.
                </td>
              </tr>
            )}
            {users.map(user => (
              <tr
                key={user._id}
                style={{ borderBottom: "1px solid rgba(188,188,201,0.06)" }}
              >
                {/* User */}
                <td style={{ padding: "12px 16px" }}>
                  <Link
                    href={`/admin/users/${user._id}`}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                    style={{ textDecoration: "none" }}
                  >
                    <Avatar user={user} />
                    <div className="min-w-0">
                      <p style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{user.name}</p>
                      <p style={{ color: "#9fa0a1", fontSize: 11 }}>{user.email}</p>
                    </div>
                  </Link>
                </td>

                {/* Role */}
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    background: user.role === "admin"
                      ? "rgba(100,117,209,0.15)" : "rgba(188,188,201,0.08)",
                    color: user.role === "admin" ? "#6475D1" : "#b3bade",
                    borderRadius: 999, fontSize: 11, fontWeight: 700,
                    padding: "3px 10px",
                  }}>
                    {user.role === "admin" && <Shield className="w-3 h-3" />}
                    {user.role}
                  </span>
                </td>

                {/* Status */}
                <td style={{ padding: "12px 16px" }}>
                  {user.isBanned ? (
                    <span style={{
                      background: "rgba(239,68,68,0.10)", color: "#ef4444",
                      borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "3px 10px",
                    }}>
                      Banned
                    </span>
                  ) : user.isVerified ? (
                    <span style={{
                      background: "rgba(68,214,44,0.10)", color: "#44d62c",
                      borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "3px 10px",
                    }}>
                      Active
                    </span>
                  ) : (
                    <span style={{
                      background: "rgba(245,158,11,0.10)", color: "#f59e0b",
                      borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "3px 10px",
                    }}>
                      Unverified
                    </span>
                  )}
                </td>

                {/* Joined */}
                <td style={{ padding: "12px 16px", color: "#9fa0a1", fontSize: 12 }}>
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>

                {/* Last seen */}
                <td style={{ padding: "12px 16px", color: "#9fa0a1", fontSize: 12 }}>
                  {new Date(user.lastSeenAt).toLocaleDateString()}
                </td>

                {/* Actions */}
                <td style={{ padding: "12px 16px" }}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBan(user)}
                      disabled={busy === user._id}
                      title={user.isBanned ? "Unban" : "Ban"}
                      style={{
                        background: user.isBanned
                          ? "rgba(68,214,44,0.10)" : "rgba(239,68,68,0.10)",
                        color: user.isBanned ? "#44d62c" : "#ef4444",
                        border: "none", borderRadius: 8, padding: "6px 8px",
                        cursor: busy === user._id ? "not-allowed" : "pointer",
                        opacity: busy === user._id ? 0.5 : 1,
                      }}
                    >
                      {user.isBanned
                        ? <UserCheck className="w-3.5 h-3.5" />
                        : <Ban className="w-3.5 h-3.5" />
                      }
                    </button>

                    {confirm === user._id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(user._id)}
                          disabled={busy === user._id}
                          style={{
                            background: "rgba(239,68,68,0.15)", color: "#ef4444",
                            border: "1px solid rgba(239,68,68,0.30)", borderRadius: 8,
                            padding: "4px 8px", fontSize: 11, cursor: "pointer",
                          }}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirm(null)}
                          style={{
                            background: "rgba(188,188,201,0.08)", color: "#9fa0a1",
                            border: "none", borderRadius: 8,
                            padding: "4px 8px", fontSize: 11, cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirm(user._id)}
                        title="Delete user"
                        style={{
                          background: "rgba(188,188,201,0.08)", color: "#9fa0a1",
                          border: "none", borderRadius: 8, padding: "6px 8px",
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            disabled={page <= 1}
            onClick={() => push({ page: String(page - 1) })}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(188,188,201,0.08)", color: "#b3bade",
              border: "1px solid rgba(188,188,201,0.15)", borderRadius: 10,
              padding: "7px 14px", fontSize: 13,
              cursor: page <= 1 ? "not-allowed" : "pointer",
              opacity: page <= 1 ? 0.4 : 1,
            }}
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <span style={{ color: "#9fa0a1", fontSize: 13 }}>{page} / {pages}</span>
          <button
            disabled={page >= pages}
            onClick={() => push({ page: String(page + 1) })}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(188,188,201,0.08)", color: "#b3bade",
              border: "1px solid rgba(188,188,201,0.15)", borderRadius: 10,
              padding: "7px 14px", fontSize: 13,
              cursor: page >= pages ? "not-allowed" : "pointer",
              opacity: page >= pages ? 0.4 : 1,
            }}
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
