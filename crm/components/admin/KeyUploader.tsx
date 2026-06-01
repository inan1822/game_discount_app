"use client"
import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { importKeys } from "@/lib/api/admin.client"
import { toast } from "react-toastify"
import { Upload, CheckCircle } from "lucide-react"

const PANEL: React.CSSProperties = {
  background: "rgba(28,30,42,0.70)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border: "1px solid rgba(188,188,201,0.15)",
  borderRadius: 10,
}

interface Props {
  productId: string
  onImported?: (inserted: number) => void
}

export function KeyUploader({ productId, onImported }: Props) {
  const [raw,     setRaw]     = useState("")
  const [parsed,  setParsed]  = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  function handleParse() {
    const lines = raw
      .split(/[\n,]/)
      .map(l => l.trim())
      .filter(Boolean)

    const unique = [...new Set(lines)]
    setParsed(unique)
  }

  async function handleImport() {
    if (parsed.length === 0) {
      toast.error("Parse the keys first")
      return
    }
    setLoading(true)
    try {
      const result = await importKeys(productId, parsed)
      toast.success(
        `✓ ${result.inserted} imported${result.duplicates > 0 ? `, ${result.duplicates} duplicate${result.duplicates !== 1 ? "s" : ""} skipped` : ""}`
      )
      setRaw("")
      setParsed([])
      onImported?.(result.inserted)
    } catch {
      toast.error("Import failed — please try again")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={PANEL} className="p-5 space-y-4">
      <h2 style={{ fontSize: 14, fontWeight: 600, color: "#b3bade" }}>Import Keys</h2>
      <p style={{ fontSize: 12, color: "#9fa0a1" }}>
        Paste one key per line (or comma-separated). Duplicates are automatically skipped.
      </p>

      <Textarea
        value={raw}
        onChange={e => { setRaw(e.target.value); setParsed([]) }}
        placeholder={"XXXXX-XXXXX-XXXXX\nYYYYY-YYYYY-YYYYY\n…"}
        style={{
          background: "#1c1e2a",
          border: "1px solid rgba(188,188,201,0.15)",
          borderRadius: 10,
          color: "#fff",
          fontSize: 12,
          fontFamily: "monospace",
          minHeight: 160,
          resize: "vertical",
          padding: "10px 12px",
        }}
      />

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleParse}
          disabled={!raw.trim()}
          style={{
            background: "rgba(100,117,209,0.20)", color: "#6475D1",
            border: "1px solid rgba(100,117,209,0.30)", borderRadius: 10,
            padding: "7px 16px", fontSize: 13, cursor: !raw.trim() ? "not-allowed" : "pointer",
            opacity: !raw.trim() ? 0.5 : 1,
          }}
        >
          Parse
        </button>

        {parsed.length > 0 && (
          <>
            <span
              className="flex items-center gap-1"
              style={{ fontSize: 13, color: "#44d62c" }}
            >
              <CheckCircle className="w-4 h-4" />
              {parsed.length} key{parsed.length !== 1 ? "s" : ""} ready
            </span>

            <button
              type="button"
              onClick={handleImport}
              disabled={loading}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: loading ? "rgba(68,214,44,0.20)" : "#44d62c",
                color: loading ? "#44d62c" : "#000",
                border: "none", borderRadius: 10,
                padding: "7px 18px", fontSize: 13, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              <Upload className="w-4 h-4" />
              {loading ? "Importing…" : "Import"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
