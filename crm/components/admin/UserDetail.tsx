"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Shield, Ban, UserCheck, Mail, Calendar,
  Clock, ShoppingBag, TrendingUp, ArrowLeft,
} from "lucide-react"
import { updateAdminUser, deleteAdminUser } from "@/lib/api/admin.client"
import { StatusBadge } from "@/components/admin/StatusBadge"
import type { AdminUserDetail, AdminUser } from "@/types/admin"

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

const PANEL: React.CSSProperties = {
  background: "rgba(28,30,42,0.70)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border: "1px solid rgba(188,188,201,0.15)",
  borderRadius: 10,
}

function Avatar({ user }: { user: AdminUser }) {
  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt=""
        style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }}
      />
    )
  }
  const initials = user.name.slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: 64, height: 64, borderRadius: "50%",
      background: "rgba(100,117,209,0.20)",
      border: "2px solid rgba(100,117,209,0.30)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 20, fontWeight: 800, color: "#6475D1",
    }}>
      {initials}
    </div>
  )
}

interface Props {
  initial: AdminUserDetail
}

export function UserDetail({ initial }: Props) {
  const router = useRouter()
  const [user, setUser] = useState(initial.user)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleBan() {
    setBusy(true)
    try {
      const updated = await updateAdminUser(user._id, { isBanned: !user.isBanned })
      setUser(prev => ({ ...prev, isBanned: updated.isBanned }))
    } catch { /* silent */ } finally { setBusy(false) }
  }

  async function handleRoleToggle() {
    const newRole = user.role === "admin" ? "user" : "admin"
    setBusy(true)
    try {
      const updated = await updateAdminUser(user._id, { role: newRole })
      setUser(prev => ({ ...prev, role: updated.role }))
    } catch { /* silent */ } finally { setBusy(false) }
  }

  async function handleDelete() {
    setBusy(true)
    setDeleteError(null)
    try {
      await deleteAdminUser(user._id)
      router.push("/users")
      router.refresh()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setDeleteError(msg ?? "Cannot delete user")
    } finally {
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2"
        style={{
          background: "rgba(28,30,42,0.60)", backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)", border: "1px solid rgba(188,188,201,0.15)",
          borderRadius: 10, color: "#b3bade", fontSize: 13,
          padding: "6px 14px", cursor: "pointer",
        }}
      >
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </button>

      {/* Profile header */}
      <div style={PANEL} className="p-6">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar user={user} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <p style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{user.name}</p>

              {/* Role badge */}
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

              {/* Banned badge */}
              {user.isBanned && (
                <span style={{
                  background: "rgba(239,68,68,0.10)", color: "#ef4444",
                  borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "3px 10px",
                }}>
                  Banned
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-4 mt-2">
              <span className="flex items-center gap-1.5" style={{ color: "#9fa0a1", fontSize: 13 }}>
                <Mail className="w-3.5 h-3.5" /> {user.email}
              </span>
              <span className="flex items-center gap-1.5" style={{ color: "#9fa0a1", fontSize: 13 }}>
                <Calendar className="w-3.5 h-3.5" /> Joined {new Date(user.createdAt).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1.5" style={{ color: "#9fa0a1", fontSize: 13 }}>
                <Clock className="w-3.5 h-3.5" /> Last seen {new Date(user.lastSeenAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleBan}
              disabled={busy}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: user.isBanned
                  ? "rgba(68,214,44,0.10)" : "rgba(239,68,68,0.10)",
                color: user.isBanned ? "#44d62c" : "#ef4444",
                border: `1px solid ${user.isBanned ? "rgba(68,214,44,0.25)" : "rgba(239,68,68,0.25)"}`,
                borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 600,
                cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1,
              }}
            >
              {user.isBanned
                ? <><UserCheck className="w-4 h-4" /> Unban</>
                : <><Ban className="w-4 h-4" /> Ban</>
              }
            </button>

            <button
              onClick={handleRoleToggle}
              disabled={busy}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(100,117,209,0.10)",
                color: "#6475D1",
                border: "1px solid rgba(100,117,209,0.25)",
                borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 600,
                cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1,
              }}
            >
              <Shield className="w-4 h-4" />
              {user.role === "admin" ? "Revoke Admin" : "Make Admin"}
            </button>

            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "rgba(188,188,201,0.08)", color: "#9fa0a1",
                  border: "1px solid rgba(188,188,201,0.15)",
                  borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  disabled={busy}
                  style={{
                    background: "rgba(239,68,68,0.15)", color: "#ef4444",
                    border: "1px solid rgba(239,68,68,0.30)", borderRadius: 10,
                    padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Confirm delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    background: "rgba(188,188,201,0.08)", color: "#9fa0a1",
                    border: "none", borderRadius: 10,
                    padding: "8px 14px", fontSize: 13, cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {deleteError && (
          <p style={{
            marginTop: 16, color: "#ef4444", fontSize: 13,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.20)",
            borderRadius: 8, padding: "8px 12px",
          }}>
            {deleteError}
          </p>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          {
            icon: ShoppingBag, label: "Total orders",
            value: String(initial.orderCount), color: "#6475D1",
          },
          {
            icon: TrendingUp, label: "Lifetime spend",
            value: currency.format(initial.lifetimeSpend), color: "#44d62c",
          },
          {
            icon: Shield, label: "Account status",
            value: user.isVerified ? "Verified" : "Unverified", color: "#f59e0b",
          },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{ ...PANEL, padding: "16px 20px" }}>
            <div className="flex items-center gap-3">
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${color}18`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div>
                <p style={{ color: "#9fa0a1", fontSize: 11, fontWeight: 500 }}>{label}</p>
                <p style={{ color: "#fff", fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      {initial.recentOrders.length > 0 && (
        <div style={PANEL} className="p-5">
          <p style={{ fontSize: 12, color: "#9fa0a1", marginBottom: 16, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Recent orders
          </p>
          <div className="space-y-3">
            {initial.recentOrders.map(order => (
              <div key={order._id} className="flex items-center justify-between gap-4 flex-wrap"
                style={{ padding: "10px 0", borderBottom: "1px solid rgba(188,188,201,0.06)" }}>
                <div>
                  <p style={{ color: "#9fa0a1", fontSize: 11, marginBottom: 2 }}>
                    #{order._id.slice(-10).toUpperCase()} · {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                  <p style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>
                    {order.items[0]?.productName ?? "Order"}
                    {order.items.length > 1 && (
                      <span style={{ color: "#9fa0a1", fontWeight: 400 }}> +{order.items.length - 1} more</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={order.status} />
                  <p style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>
                    {currency.format(order.totalAmount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
