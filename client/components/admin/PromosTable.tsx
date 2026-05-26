"use client"
import { useState } from "react"
import { Tag, ToggleLeft, ToggleRight, Trash2, Plus } from "lucide-react"
import { createPromo, togglePromo, deletePromo } from "@/lib/api/admin.client"
import type { PromoCode } from "@/types/admin"

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

const PANEL: React.CSSProperties = {
  background: "rgba(28,30,42,0.70)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border: "1px solid rgba(188,188,201,0.15)",
  borderRadius: 10,
}

const INPUT: React.CSSProperties = {
  background: "#1c1e2a",
  border: "1px solid rgba(188,188,201,0.15)",
  borderRadius: 10, color: "#fff",
  fontSize: 13, padding: "8px 12px", outline: "none", width: "100%",
}

interface Props {
  initial: PromoCode[]
}

export function PromosTable({ initial }: Props) {
  const [promos,   setPromos]   = useState<PromoCode[]>(initial)
  const [busy,     setBusy]     = useState<string | null>(null)
  const [confirm,  setConfirm]  = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formErr,  setFormErr]  = useState<string | null>(null)

  // ── Create form state ───────────────────────────────────────────────────
  const [code,     setCode]    = useState("")
  const [type,     setType]    = useState<"percent" | "fixed">("percent")
  const [value,    setValue]   = useState("")
  const [minOrder, setMinOrder] = useState("")
  const [maxUses,  setMaxUses] = useState("")
  const [expires,  setExpires] = useState("")
  const [creating, setCreating] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim() || !value) return
    setCreating(true)
    setFormErr(null)
    try {
      const promo = await createPromo({
        code,
        type,
        value: parseFloat(value),
        minOrderAmount: minOrder ? parseFloat(minOrder) : 0,
        maxUses: maxUses ? parseInt(maxUses) : null,
        expiresAt: expires || null,
      })
      setPromos(prev => [promo, ...prev])
      setCode(""); setValue(""); setMinOrder(""); setMaxUses(""); setExpires("")
      setShowForm(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormErr(msg ?? "Failed to create promo")
    } finally {
      setCreating(false)
    }
  }

  async function handleToggle(promo: PromoCode) {
    setBusy(promo._id)
    try {
      const updated = await togglePromo(promo._id, !promo.isActive)
      setPromos(prev => prev.map(p => p._id === promo._id ? { ...p, isActive: updated.isActive } : p))
    } catch { /* silent */ } finally { setBusy(null) }
  }

  async function handleDelete(id: string) {
    setBusy(id)
    try {
      await deletePromo(id)
      setPromos(prev => prev.filter(p => p._id !== id))
    } catch { /* silent */ } finally {
      setBusy(null)
      setConfirm(null)
    }
  }

  function formatDiscount(p: PromoCode) {
    return p.type === "percent" ? `${p.value}% off` : `${currency.format(p.value)} off`
  }

  const isExpired = (p: PromoCode) => p.expiresAt ? new Date(p.expiresAt) < new Date() : false

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p style={{ color: "#9fa0a1", fontSize: 13 }}>{promos.length} code{promos.length !== 1 ? "s" : ""}</p>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#6475D1", color: "#fff",
            border: "none", borderRadius: 10,
            padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          <Plus className="w-4 h-4" /> New Code
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{ ...PANEL, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Create promo code</p>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label style={{ color: "#9fa0a1", fontSize: 11, display: "block", marginBottom: 4 }}>CODE *</label>
                <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="SUMMER20" required style={INPUT} />
              </div>
              <div>
                <label style={{ color: "#9fa0a1", fontSize: 11, display: "block", marginBottom: 4 }}>TYPE *</label>
                <select value={type} onChange={e => setType(e.target.value as "percent" | "fixed")}
                  style={{ ...INPUT, cursor: "pointer" }}>
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed ($)</option>
                </select>
              </div>
              <div>
                <label style={{ color: "#9fa0a1", fontSize: 11, display: "block", marginBottom: 4 }}>
                  VALUE * {type === "percent" ? "(1–100)" : "($)"}
                </label>
                <input value={value} onChange={e => setValue(e.target.value)}
                  type="number" min="0.01" max={type === "percent" ? 100 : undefined}
                  step="0.01" required placeholder={type === "percent" ? "20" : "5.00"} style={INPUT} />
              </div>
              <div>
                <label style={{ color: "#9fa0a1", fontSize: 11, display: "block", marginBottom: 4 }}>MIN ORDER ($)</label>
                <input value={minOrder} onChange={e => setMinOrder(e.target.value)}
                  type="number" min="0" step="0.01" placeholder="0" style={INPUT} />
              </div>
              <div>
                <label style={{ color: "#9fa0a1", fontSize: 11, display: "block", marginBottom: 4 }}>MAX USES (blank = unlimited)</label>
                <input value={maxUses} onChange={e => setMaxUses(e.target.value)}
                  type="number" min="1" step="1" placeholder="∞" style={INPUT} />
              </div>
              <div>
                <label style={{ color: "#9fa0a1", fontSize: 11, display: "block", marginBottom: 4 }}>EXPIRES</label>
                <input value={expires} onChange={e => setExpires(e.target.value)}
                  type="datetime-local" style={INPUT} />
              </div>
            </div>

            {formErr && (
              <p style={{ color: "#ef4444", fontSize: 13,
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)",
                borderRadius: 8, padding: "8px 12px" }}>
                {formErr}
              </p>
            )}

            <div className="flex gap-3">
              <button type="submit" disabled={creating}
                style={{
                  background: creating ? "rgba(100,117,209,0.40)" : "#6475D1",
                  color: "#fff", border: "none", borderRadius: 10,
                  padding: "9px 20px", fontSize: 13, fontWeight: 700,
                  cursor: creating ? "not-allowed" : "pointer",
                }}>
                {creating ? "Creating…" : "Create"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                style={{
                  background: "rgba(188,188,201,0.08)", color: "#9fa0a1",
                  border: "none", borderRadius: 10,
                  padding: "9px 20px", fontSize: 13, cursor: "pointer",
                }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div style={PANEL} className="overflow-x-auto">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(188,188,201,0.10)" }}>
              {["Code", "Discount", "Min order", "Usage", "Expires", "Status", "Actions"].map(h => (
                <th key={h} style={{
                  padding: "10px 16px", textAlign: "left",
                  fontSize: 11, fontWeight: 700, color: "#9fa0a1",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {promos.length === 0 && (
              <tr><td colSpan={7} style={{ padding: "40px 16px", textAlign: "center", color: "#9fa0a1", fontSize: 14 }}>
                No promo codes yet. Create one above.
              </td></tr>
            )}
            {promos.map(p => (
              <tr key={p._id} style={{ borderBottom: "1px solid rgba(188,188,201,0.06)" }}>
                {/* Code */}
                <td style={{ padding: "12px 16px" }}>
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5" style={{ color: "#6475D1", flexShrink: 0 }} />
                    <span style={{ color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "monospace" }}>
                      {p.code}
                    </span>
                  </div>
                </td>
                {/* Discount */}
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    background: "rgba(68,214,44,0.10)", color: "#44d62c",
                    borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "3px 10px",
                  }}>
                    {formatDiscount(p)}
                  </span>
                </td>
                {/* Min order */}
                <td style={{ padding: "12px 16px", color: "#9fa0a1", fontSize: 12 }}>
                  {p.minOrderAmount > 0 ? currency.format(p.minOrderAmount) : "—"}
                </td>
                {/* Usage */}
                <td style={{ padding: "12px 16px", color: "#9fa0a1", fontSize: 12 }}>
                  {p.usedCount} / {p.maxUses ?? "∞"}
                </td>
                {/* Expires */}
                <td style={{ padding: "12px 16px", color: isExpired(p) ? "#ef4444" : "#9fa0a1", fontSize: 12 }}>
                  {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : "Never"}
                </td>
                {/* Status */}
                <td style={{ padding: "12px 16px" }}>
                  {isExpired(p) ? (
                    <span style={{ background: "rgba(239,68,68,0.10)", color: "#ef4444",
                      borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "3px 10px" }}>
                      Expired
                    </span>
                  ) : p.isActive ? (
                    <span style={{ background: "rgba(68,214,44,0.10)", color: "#44d62c",
                      borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "3px 10px" }}>
                      Active
                    </span>
                  ) : (
                    <span style={{ background: "rgba(188,188,201,0.08)", color: "#9fa0a1",
                      borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "3px 10px" }}>
                      Inactive
                    </span>
                  )}
                </td>
                {/* Actions */}
                <td style={{ padding: "12px 16px" }}>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToggle(p)} disabled={busy === p._id || isExpired(p)}
                      title={p.isActive ? "Deactivate" : "Activate"}
                      style={{
                        background: "transparent", border: "none", padding: 4,
                        cursor: busy === p._id || isExpired(p) ? "not-allowed" : "pointer",
                        opacity: busy === p._id ? 0.5 : 1, color: p.isActive ? "#44d62c" : "#9fa0a1",
                      }}>
                      {p.isActive
                        ? <ToggleRight className="w-5 h-5" />
                        : <ToggleLeft className="w-5 h-5" />
                      }
                    </button>

                    {confirm === p._id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(p._id)} disabled={busy === p._id}
                          style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444",
                            border: "1px solid rgba(239,68,68,0.30)", borderRadius: 8,
                            padding: "3px 8px", fontSize: 11, cursor: "pointer" }}>
                          Yes
                        </button>
                        <button onClick={() => setConfirm(null)}
                          style={{ background: "rgba(188,188,201,0.08)", color: "#9fa0a1",
                            border: "none", borderRadius: 8, padding: "3px 8px", fontSize: 11, cursor: "pointer" }}>
                          No
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirm(p._id)}
                        style={{ background: "rgba(188,188,201,0.08)", color: "#9fa0a1",
                          border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer" }}>
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
    </div>
  )
}
