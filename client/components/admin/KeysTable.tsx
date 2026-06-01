"use client"
import { useState } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/table"
import { keysExportUrl } from "@/lib/api/admin.client"
import type { GameKey, KeyStatus, KeysPage } from "@/shared/types/admin"
import { Download, Eye, EyeOff } from "lucide-react"

const STATUS_STYLE: Record<KeyStatus, { bg: string; color: string }> = {
  available: { bg: "rgba(68,214,44,0.12)",   color: "#44d62c" },
  reserved:  { bg: "rgba(245,158,11,0.12)",  color: "#f59e0b" },
  sold:      { bg: "rgba(159,160,161,0.12)", color: "#9fa0a1" },
}

function KeyStatusBadge({ status }: { status: KeyStatus }) {
  const { bg, color } = STATUS_STYLE[status]
  return (
    <span style={{ background: bg, color, borderRadius: 999, fontSize: 11, fontWeight: 600, padding: "3px 10px", textTransform: "capitalize" }}>
      {status}
    </span>
  )
}

function maskCode(code: string): string {
  return code.replace(/[^-]/g, "•")
}

interface Props {
  productId: string
  initialData: KeysPage
}

export function KeysTable({ productId, initialData }: Props) {
  const [keys]      = useState<GameKey[]>(initialData.keys)
  const [revealed,  setRevealed]  = useState<Record<string, boolean>>({})

  function toggleReveal(id: string) {
    setRevealed(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const exportHref = keysExportUrl(productId)

  return (
    <div style={{
      background: "rgba(28,30,42,0.70)",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      border: "1px solid rgba(188,188,201,0.15)",
      borderRadius: 10,
      overflow: "hidden",
    }}>
      <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid rgba(188,188,201,0.10)" }}>
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "#b3bade" }}>Key Inventory</h2>
          <p style={{ fontSize: 12, color: "#9fa0a1", marginTop: 2 }}>{initialData.total} total keys</p>
        </div>
        <a
          href={exportHref}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(68,214,44,0.12)", color: "#44d62c",
            border: "1px solid rgba(68,214,44,0.25)", borderRadius: 10,
            padding: "6px 14px", fontSize: 13, textDecoration: "none",
          }}
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </a>
      </div>

      {keys.length === 0 ? (
        <p style={{ color: "#9fa0a1", fontSize: 13, textAlign: "center", padding: "40px 0" }}>
          No keys yet. Use the uploader below to import.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow style={{ borderColor: "rgba(188,188,201,0.10)" }}>
              {["#", "Code", "Status", "Sold At", "Reveal"].map(h => (
                <TableHead key={h} style={{ color: "#9fa0a1", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map((k, i) => (
              <TableRow key={k._id} style={{ borderColor: "rgba(188,188,201,0.08)" }}>
                <TableCell style={{ color: "#9fa0a1", fontSize: 12 }}>{i + 1}</TableCell>
                <TableCell>
                  <span style={{ fontFamily: "monospace", fontSize: 13, color: "#fff", letterSpacing: 1 }}>
                    {k.code
                      ? (revealed[k._id] ? k.code : maskCode(k.code))
                      : "••••••••••••••••"}
                  </span>
                </TableCell>
                <TableCell><KeyStatusBadge status={k.status} /></TableCell>
                <TableCell style={{ color: "#9fa0a1", fontSize: 12 }}>
                  {k.soldAt ? new Date(k.soldAt).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell>
                  {k.code ? (
                    <button
                      type="button"
                      onClick={() => toggleReveal(k._id)}
                      style={{ color: "#9fa0a1", background: "none", border: "none", cursor: "pointer", display: "flex" }}
                      title={revealed[k._id] ? "Hide" : "Reveal"}
                    >
                      {revealed[k._id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  ) : (
                    <span style={{ color: "#9fa0a1", fontSize: 11 }}>—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {initialData.pages > 1 && (
        <div className="p-3" style={{ borderTop: "1px solid rgba(188,188,201,0.10)" }}>
          <p style={{ fontSize: 12, color: "#9fa0a1" }}>
            Showing page 1 of {initialData.pages}. Export CSV for the full list.
          </p>
        </div>
      )}
    </div>
  )
}
