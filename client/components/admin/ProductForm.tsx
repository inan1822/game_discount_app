"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { createProduct, updateProduct } from "@/lib/api/admin.client"
import { searchGames, getGameById } from "@/lib/api/games"
import type { Product } from "@/types/admin"
import type { Game } from "@/types/game"
import { toast } from "react-toastify"
import { ArrowLeft, Search, X, Loader2, GamepadIcon, ImageIcon } from "lucide-react"

// ─── Styles ───────────────────────────────────────────────────────────────────

const PANEL: React.CSSProperties = {
  background: "rgba(28,30,42,0.70)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border: "1px solid rgba(188,188,201,0.15)",
  borderRadius: 10,
}

const INPUT_STYLE: React.CSSProperties = {
  background: "#1c1e2a",
  border: "1px solid rgba(188,188,201,0.15)",
  borderRadius: 10,
  color: "#fff",
  fontSize: 13,
  padding: "8px 12px",
  outline: "none",
  width: "100%",
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 12, color: "#9fa0a1", fontWeight: 600, marginBottom: 6, display: "block",
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  name: string
  description: string
  imageUrl: string
  rawgGameId: string
  rawgGameName: string
  rawgReleased: string
  platform: string
  category: string
  price: string
  isActive: boolean
}

const DEFAULT_FORM: FormState = {
  name: "", description: "", imageUrl: "",
  rawgGameId: "", rawgGameName: "", rawgReleased: "",
  platform: "PC", category: "gamekey", price: "", isActive: true,
}

function formFromProduct(p: Product): FormState {
  return {
    name: p.name, description: p.description, imageUrl: p.imageUrl,
    rawgGameId: p.rawgGameId ?? "", rawgGameName: p.rawgGameName ?? "", rawgReleased: "",
    platform: p.platform, category: p.category, price: String(p.price), isActive: p.isActive,
  }
}

// ─── Game Picker Modal ────────────────────────────────────────────────────────

function GamePickerModal({
  query,
  results,
  loading,
  onSelect,
  onClose,
}: {
  query: string
  results: Game[]
  loading: boolean
  onSelect: (g: Game) => void
  onClose: () => void
}) {
  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.70)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{
        background: "rgba(22,24,36,0.98)",
        border: "1px solid rgba(188,188,201,0.15)",
        borderRadius: 14,
        width: "100%",
        maxWidth: 760,
        maxHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid rgba(188,188,201,0.10)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <p style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>
              Select a game
            </p>
            {query && (
              <p style={{ color: "#9fa0a1", fontSize: 12, marginTop: 2 }}>
                Results for &ldquo;{query}&rdquo;
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(188,188,201,0.08)", border: "none",
              borderRadius: 8, color: "#b3bade", cursor: "pointer",
              width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "16px 20px", flex: 1, scrollbarWidth: "none" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0", gap: 10 }}>
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#6475D1" }} />
              <span style={{ color: "#9fa0a1", fontSize: 13 }}>Searching…</span>
            </div>
          ) : results.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <GamepadIcon className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(188,188,201,0.20)" }} />
              <p style={{ color: "#9fa0a1", fontSize: 13 }}>No games found. Try a different title.</p>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 12,
            }}>
              {results.map(g => (
                <GameCard key={g.id} game={g} onSelect={onSelect} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function GameCard({ game, onSelect }: { game: Game; onSelect: (g: Game) => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      type="button"
      onClick={() => onSelect(game)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(100,117,209,0.15)" : "rgba(28,30,42,0.80)",
        border: hovered
          ? "1px solid rgba(100,117,209,0.45)"
          : "1px solid rgba(188,188,201,0.10)",
        borderRadius: 10,
        overflow: "hidden",
        cursor: "pointer",
        textAlign: "left",
        padding: 0,
        transition: "all 0.18s",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      {/* Cover image */}
      <div style={{ position: "relative", height: 110, overflow: "hidden", background: "#12131a" }}>
        {game.cover ? (
          <img
            src={game.cover}
            alt={game.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <ImageIcon className="w-8 h-8" style={{ color: "rgba(188,188,201,0.15)" }} />
          </div>
        )}
        {/* Hover overlay */}
        {hovered && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(100,117,209,0.20)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{
              background: "#6475D1", color: "#fff", fontSize: 11,
              fontWeight: 700, borderRadius: 999, padding: "4px 12px",
            }}>
              Select
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "10px 12px" }}>
        <p style={{
          color: "#fff", fontSize: 12, fontWeight: 600,
          lineHeight: 1.35,
          overflow: "hidden", display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>
          {game.name}
        </p>
        {game.released && (
          <p style={{ color: "#9fa0a1", fontSize: 10, marginTop: 3 }}>
            {game.released.slice(0, 4)}
          </p>
        )}
      </div>
    </button>
  )
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export function ProductForm({ mode, product }: { mode: "create" | "edit"; product?: Product }) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(product ? formFromProduct(product) : DEFAULT_FORM)
  const [saving, setSaving] = useState(false)

  // Search state
  const [searchQuery,  setSearchQuery]  = useState(product?.rawgGameName ?? "")
  const [searchResults, setSearchResults] = useState<Game[]>([])
  const [searching,    setSearching]    = useState(false)
  const [modalOpen,    setModalOpen]    = useState(false)
  const [loadingDesc,  setLoadingDesc]  = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced search — fires automatically as user types, opens modal with results
  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const results = await searchGames(q.trim())
      setSearchResults(results ?? [])
      if (results && results.length > 0) setModalOpen(true)
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!searchQuery.trim() || form.rawgGameId) return  // don't search after game selected
    debounceRef.current = setTimeout(() => runSearch(searchQuery), 380)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery, form.rawgGameId, runSearch])

  // Manual search trigger (Enter key or Search button)
  async function triggerSearch() {
    if (searchQuery.trim().length < 2) return
    setModalOpen(true)
    setSearching(true)
    setSearchResults([])
    try {
      const results = await searchGames(searchQuery.trim())
      setSearchResults(results ?? [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  async function selectGame(g: Game) {
    setModalOpen(false)
    setSearchQuery(g.name)
    setForm(prev => ({
      ...prev,
      rawgGameId:   String(g.id),
      rawgGameName: g.name,
      rawgReleased: g.released ?? "",
      name:         g.name,
      imageUrl:     g.cover ?? "",
      description:  g.description ?? "",
    }))

    // If description not in search result, fetch full game detail
    if (!g.description) {
      setLoadingDesc(true)
      try {
        const full = await getGameById(String(g.id))
        if (full?.description) {
          setForm(prev => ({ ...prev, description: full.description! }))
        }
      } catch { /* non-critical */ }
      finally { setLoadingDesc(false) }
    }
  }

  function clearGame() {
    setForm(prev => ({
      ...prev,
      rawgGameId: "", rawgGameName: "", rawgReleased: "",
      name: "", imageUrl: "", description: "",
    }))
    setSearchQuery("")
    setSearchResults([])
  }

  function set(key: keyof FormState, value: string | boolean) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.rawgGameId) {
      toast.error("Select a game from the RAWG catalog before saving")
      return
    }
    if (!form.platform || !form.category || !form.price) {
      toast.error("Platform, category and price are required")
      return
    }
    setSaving(true)
    try {
      const payload = {
        name:         form.name,
        description:  form.description,
        imageUrl:     form.imageUrl,
        rawgGameId:   form.rawgGameId,
        rawgGameName: form.rawgGameName,
        platform:     form.platform,
        category:     form.category,
        price:        parseFloat(form.price),
        isActive:     form.isActive,
      }
      if (mode === "create") {
        await createProduct(payload)
        toast.success("Product created")
      } else {
        await updateProduct(product!._id, payload)
        toast.success("Product updated")
      }
      router.push("/admin/products")
    } catch {
      toast.error("Failed to save product")
    } finally {
      setSaving(false)
    }
  }

  const gameSelected = !!form.rawgGameId

  return (
    <>
      {/* Game Picker Modal */}
      {modalOpen && (
        <GamePickerModal
          query={searchQuery}
          results={searchResults}
          loading={searching}
          onSelect={selectGame}
          onClose={() => setModalOpen(false)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {/* Back */}
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2"
          style={{
            background: "rgba(28,30,42,0.60)", backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)", border: "1px solid rgba(188,188,201,0.15)",
            borderRadius: 10, color: "#b3bade", fontSize: 13, padding: "6px 14px", cursor: "pointer",
          }}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* ── RAWG Game Picker ── */}
        <div style={PANEL} className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <GamepadIcon className="w-4 h-4" style={{ color: "#6475D1" }} />
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "#b3bade" }}>
              {mode === "create" ? "New Product" : "Edit Product"} — Link to RAWG Game
            </h2>
          </div>
          <p style={{ fontSize: 12, color: "#9fa0a1" }}>
            Search the RAWG catalog and pick a game. Cover image, description and name
            are pulled automatically.
          </p>

          {gameSelected ? (
            /* ── Selected game preview ── */
            <div style={{
              background: "rgba(100,117,209,0.08)", borderRadius: 10,
              border: "1px solid rgba(100,117,209,0.25)", padding: "14px",
            }}>
              <div className="flex gap-4">
                {form.imageUrl ? (
                  <img
                    src={form.imageUrl}
                    alt=""
                    style={{ width: 120, height: 68, objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: 120, height: 68, borderRadius: 8, flexShrink: 0,
                    background: "rgba(100,117,209,0.10)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <ImageIcon className="w-6 h-6" style={{ color: "rgba(100,117,209,0.30)" }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p style={{ color: "#fff", fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>
                        {form.rawgGameName}
                      </p>
                      <p style={{ color: "#9fa0a1", fontSize: 11, marginTop: 2 }}>
                        {form.rawgReleased ? form.rawgReleased.slice(0, 4) + " · " : ""}
                        RAWG ID {form.rawgGameId}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={clearGame}
                      title="Change game"
                      style={{
                        background: "rgba(188,188,201,0.08)", border: "none",
                        borderRadius: 8, color: "#9fa0a1", cursor: "pointer",
                        width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {loadingDesc ? (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#9fa0a1" }} />
                      <span style={{ fontSize: 11, color: "#9fa0a1" }}>Loading description…</span>
                    </div>
                  ) : form.description ? (
                    <p style={{ color: "#9fa0a1", fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>
                      {form.description.slice(0, 120)}{form.description.length > 120 ? "…" : ""}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            /* ── Search input ── */
            <div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                    style={{ color: "#9fa0a1" }}
                  />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); triggerSearch() } }}
                    placeholder="Type a game title… (e.g. Risk of Rain 2, Elden Ring)"
                    style={{ ...INPUT_STYLE, paddingLeft: 30 }}
                  />
                </div>
                <button
                  type="button"
                  onClick={triggerSearch}
                  disabled={searching || searchQuery.trim().length < 2}
                  style={{
                    background: searching || searchQuery.trim().length < 2
                      ? "rgba(100,117,209,0.30)"
                      : "#6475D1",
                    color: "#fff", border: "none", borderRadius: 10,
                    padding: "0 16px", fontSize: 13, fontWeight: 600,
                    cursor: searching || searchQuery.trim().length < 2 ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  {searching
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching…</>
                    : <><Search className="w-3.5 h-3.5" /> Search</>}
                </button>
              </div>
              <p style={{ fontSize: 11, color: "#9fa0a1", marginTop: 6 }}>
                Results open in a popup — type and press Enter or click Search.
              </p>
            </div>
          )}
        </div>

        {/* ── Product Settings ── */}
        <div style={PANEL} className="p-5 space-y-4">
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "#b3bade" }}>Product Settings</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={LABEL_STYLE}>Category *</label>
              <Select value={form.category} onValueChange={val => set("category", val)}>
                <SelectTrigger style={{ ...INPUT_STYLE, height: 38 }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{
                  background: "#1c1e2a",
                  border: "1px solid rgba(188,188,201,0.15)", borderRadius: 10,
                }}>
                  {[
                    ["gamekey",      "Game Key"],
                    ["giftcard",     "Gift Card"],
                    ["subscription", "Subscription"],
                    ["dlc",          "DLC"],
                    ["currency",     "Currency"],
                  ].map(([v, l]) => (
                    <SelectItem key={v} value={v} style={{ color: "#fff", fontSize: 13 }}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label style={LABEL_STYLE}>Platform *</label>
              <Select value={form.platform} onValueChange={val => set("platform", val)}>
                <SelectTrigger style={{ ...INPUT_STYLE, height: 38 }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{
                  background: "#1c1e2a",
                  border: "1px solid rgba(188,188,201,0.15)", borderRadius: 10,
                }}>
                  {["PC", "PS5", "Xbox", "Switch", "Other"].map(v => (
                    <SelectItem key={v} value={v} style={{ color: "#fff", fontSize: 13 }}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={LABEL_STYLE}>Price (USD) *</label>
              <input
                type="number" min="0" step="0.01"
                value={form.price}
                onChange={e => set("price", e.target.value)}
                placeholder="9.99"
                style={INPUT_STYLE}
              />
            </div>

            <div className="flex items-center gap-3 pt-5">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={e => set("isActive", e.target.checked)}
                style={{ width: 16, height: 16, accentColor: "#6475D1", cursor: "pointer" }}
              />
              <label htmlFor="isActive" style={{ ...LABEL_STYLE, marginBottom: 0, cursor: "pointer" }}>
                Active (visible in storefront)
              </label>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving || !gameSelected}
            style={{
              background: (saving || !gameSelected) ? "rgba(100,117,209,0.40)" : "#6475D1",
              color: "#fff", borderRadius: 10, padding: "10px 28px",
              fontSize: 14, fontWeight: 600,
              cursor: (saving || !gameSelected) ? "not-allowed" : "pointer",
              border: "none",
            }}
          >
            {saving ? "Saving…" : mode === "create" ? "Create Product" : "Save Changes"}
          </button>
          {!gameSelected && (
            <p style={{ fontSize: 12, color: "#9fa0a1" }}>
              Select a game above to enable save
            </p>
          )}
        </div>
      </form>
    </>
  )
}
