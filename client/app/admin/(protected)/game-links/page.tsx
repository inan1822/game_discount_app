"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { toast } from "react-toastify"
import {
  Plus, Search, Pencil, Trash2, Link2, ExternalLink, Loader2, X,
  Gamepad2, ChevronDown, ChevronUp, AlertTriangle, Package, Sparkles,
} from "lucide-react"
import {
  listGameLinks, createGameLink, updateGameLink, deleteGameLink,
} from "@/lib/api/admin.client"
import { searchGames } from "@/features/products/services/games"
import { SectionHeading } from "@/shared/components/SectionHeading"
import { analyzeStoreLink } from "@/shared/services/adminLLM"
import type { AdminManualLink, ManualLinkPlatform } from "@/shared/types/admin"
import type { Game } from "@/shared/types/game"

// ── Design tokens ──────────────────────────────────────────────────────────────
const ACCENT  = "#6475D1"
const CARD: React.CSSProperties = {
  background:           "rgba(28,30,42,0.70)",
  backdropFilter:       "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border:               "1px solid rgba(31,37,57,0.6)",
  borderRadius:         10,
}
const ROW_BORDER = "1px solid rgba(31,37,57,0.6)"

const INPUT: React.CSSProperties = {
  background:  "#1c1e2a",
  border:      "1px solid rgba(188,188,201,0.15)",
  borderRadius: 10,
  color:       "#fff",
  fontSize:    13,
  padding:     "8px 12px",
  outline:     "none",
  width:       "100%",
}

// ── Known stores — icon quick-picker ──────────────────────────────────────────
const G = (d: string) => `https://www.google.com/s2/favicons?domain=${d}&sz=128`

const KNOWN_STORES: { name: string; icon: string; platform?: ManualLinkPlatform }[] = [
  // ── PC digital stores
  { name: "Steam",              icon: G("store.steampowered.com"),  platform: "pc"    },
  { name: "GOG",                icon: G("gog.com"),                 platform: "pc"    },
  { name: "Epic Games Store",   icon: G("epicgames.com"),           platform: "pc"    },
  { name: "Humble Store",       icon: G("humblebundle.com"),        platform: "pc"    },
  { name: "Fanatical",          icon: G("fanatical.com"),           platform: "pc"    },
  { name: "Green Man Gaming",   icon: G("greenmangaming.com"),      platform: "pc"    },
  { name: "GamersGate",         icon: G("gamersgate.com"),          platform: "pc"    },
  { name: "GameBillet",         icon: G("gamebillet.com"),          platform: "pc"    },
  { name: "IndieGala",          icon: G("indiegala.com"),           platform: "pc"    },
  { name: "AllYouPlay",         icon: G("allyouplay.com"),          platform: "pc"    },
  { name: "2Game",              icon: G("2game.com"),               platform: "pc"    },
  { name: "WinGameStore",       icon: G("wingamestore.com"),        platform: "pc"    },
  { name: "Gamesload",          icon: G("gamesload.com"),           platform: "pc"    },
  { name: "Nuuvem",             icon: G("nuuvem.com"),              platform: "pc"    },
  { name: "GamesplanetUS",      icon: G("us.gamesplanet.com"),      platform: "pc"    },
  { name: "GamesplanetUK",      icon: G("uk.gamesplanet.com"),      platform: "pc"    },
  { name: "GamesplanetDE",      icon: G("de.gamesplanet.com"),      platform: "pc"    },
  // ── Launchers / dev stores
  { name: "EA App",             icon: G("ea.com"),                  platform: "pc"    },
  { name: "Ubisoft Store",      icon: G("store.ubisoft.com"),       platform: "pc"    },
  { name: "Battle.net",         icon: G("battle.net"),              platform: "pc"    },
  { name: "Rockstar Store",     icon: G("rockstargames.com"),       platform: "pc"    },
  { name: "Bethesda",           icon: G("bethesda.net"),            platform: "pc"    },
  { name: "itch.io",            icon: G("itch.io"),                 platform: "pc"    },
  // ── Key resellers (all platforms)
  { name: "CDKeys",             icon: G("cdkeys.com"),              platform: "all"   },
  { name: "Kinguin",            icon: G("kinguin.net"),             platform: "all"   },
  { name: "G2A",                icon: G("g2a.com"),                 platform: "all"   },
  { name: "Eneba",              icon: G("eneba.com"),               platform: "all"   },
  { name: "K4G",                icon: G("k4g.com"),                 platform: "all"   },
  { name: "DLGamer",            icon: G("dlgamer.com"),             platform: "all"   },
  // ── Console stores
  { name: "PlayStation Store",  icon: G("store.playstation.com"),   platform: "ps"    },
  { name: "Xbox Store",         icon: G("xbox.com"),                platform: "xbox"  },
  { name: "Microsoft Store",    icon: G("microsoft.com"),           platform: "xbox"  },
  { name: "Nintendo eShop",     icon: G("nintendo.com"),            platform: "switch"},
  // ── PSN / Xbox wallet top-ups
  { name: "PSN Gift Cards",     icon: G("store.playstation.com"),   platform: "ps"    },
  { name: "Xbox Gift Cards",    icon: G("xbox.com"),                platform: "xbox"  },
]

// ── Known subscriptions ────────────────────────────────────────────────────────
const KNOWN_SUBS = [
  "PS Plus Essential",
  "PS Plus Extra",
  "PS Plus Premium",
  "Xbox Game Pass",
  "PC Game Pass",
  "Xbox Game Pass Ultimate",
  "EA Play",
  "EA Play Pro",
  "Ubisoft+",
  "Apple Arcade",
  "Netflix Games",
  "Amazon Prime Gaming",
]

const PLATFORM_OPTIONS: { value: ManualLinkPlatform; label: string }[] = [
  { value: "all",    label: "All platforms" },
  { value: "pc",     label: "PC" },
  { value: "ps",     label: "PlayStation" },
  { value: "xbox",   label: "Xbox" },
  { value: "switch", label: "Switch" },
]
const PLATFORM_LABELS: Record<ManualLinkPlatform, string> = {
  all: "All", pc: "PC", ps: "PlayStation", xbox: "Xbox", switch: "Switch",
}

// ── Days-left helper ──────────────────────────────────────────────────────────
function daysLeft(iso: string | null): number | null {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminGameLinksPage() {
  const [links, setLinks]       = useState<AdminManualLink[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState("")
  const [modalOpen, setModal]   = useState(false)
  const [editing, setEditing]   = useState<AdminManualLink | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try   { setLinks(await listGameLinks()) }
    catch { toast.error("Failed to load links") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // Listen for AI "Fill Form" events dispatched from the AIAssistant chat drawer
  useEffect(() => {
    const handler = (e: Event) => {
      const data = (e as CustomEvent).detail as {
        rawgId?: number | null; rawgName?: string | null; label?: string; url?: string
        platform?: string; price?: number | null; storeIcon?: string
        subscriptionName?: string | null; discountExpiresAt?: string | null; note?: string
      }
      // Pre-fill editing state so LinkModal opens with all fields populated
      const prefilled = {
        _id: "", rawgId: String(data.rawgId ?? ""), rawgName: data.rawgName ?? "",
        label: data.label ?? "", url: data.url ?? "",
        platform: (data.platform ?? "all") as AdminManualLink["platform"],
        price: data.price ?? null, storeIcon: data.storeIcon ?? "",
        subscriptionName: data.subscriptionName ?? null,
        discountExpiresAt: data.discountExpiresAt ?? null,
        note: data.note ?? "", isActive: true, isLimitedStock: false,
        inStock: true, aiTracking: false, aiTrackFailures: 0,
        healthStatus: "unknown" as const, lastHealthCheck: null,
        createdAt: "", updatedAt: "",
      } satisfies AdminManualLink
      setEditing(prefilled)
      setModal(true)
    }
    window.addEventListener("dislow:fill-game-link", handler)
    return () => window.removeEventListener("dislow:fill-game-link", handler)
  }, [])

  const handleToggle = async (link: AdminManualLink) => {
    try {
      await updateGameLink(link._id, { isActive: !link.isActive })
      toast.success(link.isActive ? "Link hidden" : "Link published")
      load()
    } catch { toast.error("Update failed") }
  }

  const handleToggleStock = async (link: AdminManualLink) => {
    try {
      await updateGameLink(link._id, { inStock: !link.inStock })
      toast.success(link.inStock ? "Marked out-of-stock" : "Marked in-stock")
      load()
    } catch { toast.error("Update failed") }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this link permanently?")) return
    try {
      await deleteGameLink(id)
      toast.success("Link deleted")
      load()
    } catch { toast.error("Delete failed") }
  }



  const q = search.trim().toLowerCase()
  const filtered = q
    ? links.filter(l =>
        l.rawgName.toLowerCase().includes(q) ||
        l.label.toLowerCase().includes(q) ||
        l.url.toLowerCase().includes(q))
    : links

  // Warn count — expired or out-of-stock active links
  const warnCount = links.filter(l =>
    l.isActive && (!l.inStock || (l.discountExpiresAt && daysLeft(l.discountExpiresAt)! <= 0)),
  ).length

  return (
    <div style={{ width: "min(calc(100% - 192px), 1600px)", marginInline: "auto", paddingBlock: 40 }}>

      <SectionHeading
        title="Game Links"
        right={
          <button
            onClick={() => { setEditing(null); setModal(true) }}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: ACCENT, color: "#fff",
              borderRadius: 10, padding: "8px 18px",
              fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
            }}
          >
            <Plus size={15} /> New Link
          </button>
        }
      />

      <p style={{ fontSize: 13, color: "#9fa0a1", marginTop: -16, marginBottom: 24 }}>
        Manual store &amp; website links injected into each game&apos;s Discounts tab.
        {" "}{links.length} total
        {warnCount > 0 && (
          <span style={{ color: "#F59E0B", marginLeft: 8 }}>
            · ⚠ {warnCount} link{warnCount !== 1 ? "s" : ""} need attention
          </span>
        )}
      </p>

      {/* Search */}
      <div style={{ position: "relative", maxWidth: 420, marginBottom: 20 }}>
        <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9fa0a1" }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by game, label, or URL…"
          style={{ ...INPUT, paddingLeft: 36 }}
        />
      </div>

      {/* Table */}
      <div style={{ ...CARD, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: ROW_BORDER }}>
              {["Game", "Link / Store", "Platform", "Price / Deal", "Expiry", "Health", "Stock", "Status", "Actions"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: "#9fa0a1", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.map(link => {
              const dl  = daysLeft(link.discountExpiresAt)
              const expired  = dl !== null && dl <= 0
              const expiring = dl !== null && dl > 0 && dl <= 3

              return (
                <tr key={link._id} style={{ borderBottom: ROW_BORDER, opacity: (!link.inStock || expired) ? 0.55 : 1 }}>
                  {/* Game */}
                  <td style={{ padding: "12px 14px" }}>
                    <p style={{ color: "#fff", fontWeight: 600 }}>{link.rawgName || "—"}</p>
                    <p style={{ color: "#9fa0a1", fontSize: 11 }}>RAWG #{link.rawgId}</p>
                  </td>

                  {/* Link */}
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#2a2d32", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {link.storeIcon
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={link.storeIcon} alt="" style={{ width: 20, height: 20, objectFit: "contain" }} />
                          : <Link2 size={14} color={ACCENT} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ color: "#fff", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>
                          {link.label}
                        </p>
                        {link.subscriptionName && (
                          <p style={{ fontSize: 11, color: "#AE3BD6", fontWeight: 600 }}>
                            {link.subscriptionName}
                          </p>
                        )}
                        <a href={link.url} target="_blank" rel="noopener noreferrer"
                          style={{ display: "flex", alignItems: "center", gap: 4, color: ACCENT, fontSize: 11, textDecoration: "none", maxWidth: 220 }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {link.url.replace(/^https?:\/\//, "")}
                          </span>
                          <ExternalLink size={9} style={{ flexShrink: 0 }} />
                        </a>
                      </div>
                    </div>
                  </td>

                  {/* Platform */}
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ background: "rgba(100,117,209,0.15)", color: ACCENT, borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "3px 9px" }}>
                      {PLATFORM_LABELS[link.platform]}
                    </span>
                  </td>

                  {/* Price */}
                  <td style={{ padding: "12px 14px" }}>
                    {link.subscriptionName
                      ? <span style={{ color: "#AE3BD6", fontWeight: 700 }}>FREE w/ sub</span>
                      : link.price != null
                        ? <span style={{ color: "#fff", fontWeight: 600 }}>${link.price.toFixed(2)}</span>
                        : <span style={{ color: "#9fa0a1" }}>Visit site</span>}
                  </td>

                  {/* Expiry */}
                  <td style={{ padding: "12px 14px" }}>
                    {expired
                      ? <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 700 }}>EXPIRED</span>
                      : expiring
                        ? <span style={{ color: "#F59E0B", fontSize: 12, fontWeight: 700 }}>⚠ {dl}d left</span>
                        : dl !== null
                          ? <span style={{ color: "#9fa0a1", fontSize: 12 }}>{dl}d left</span>
                          : <span style={{ color: "#9fa0a1", fontSize: 12 }}>—</span>}
                  </td>

                  {/* Health */}
                  <td style={{ padding: "12px 14px" }}>
                    <div title={link.lastHealthCheck
                      ? `Last checked: ${new Date(link.lastHealthCheck).toLocaleString()}`
                      : "Not yet checked"}
                      style={{ display: "flex", alignItems: "center", gap: 6, cursor: "default" }}>
                      <span style={{
                        width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
                        background: link.healthStatus === "ok"   ? "#44d62c"
                                  : link.healthStatus === "dead" ? "#ef4444"
                                  : "#9fa0a1",
                        boxShadow: link.healthStatus === "ok"   ? "0 0 6px rgba(68,214,44,0.7)"
                                 : link.healthStatus === "dead" ? "0 0 6px rgba(239,68,68,0.7)"
                                 : "none",
                      }} />
                      <span style={{ fontSize: 11, color: "#9fa0a1" }}>
                        {link.healthStatus === "ok"   ? "Online"
                       : link.healthStatus === "dead" ? "Dead"
                       : "—"}
                      </span>
                    </div>
                  </td>

                  {/* Stock */}
                  <td style={{ padding: "12px 14px" }}>
                    {link.isLimitedStock ? (
                      <button
                        onClick={() => handleToggleStock(link)}
                        title={link.inStock ? "Click to mark out-of-stock" : "Click to mark in-stock"}
                        style={{
                          background: link.inStock ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)",
                          color:      link.inStock ? "#F59E0B"               : "#ef4444",
                          borderRadius: 999, fontSize: 11, fontWeight: 700,
                          padding: "3px 9px", border: "none", cursor: "pointer",
                        }}
                      >
                        {link.inStock ? "Limited" : "Out of stock"}
                      </button>
                    ) : (
                      <span style={{ color: "#9fa0a1", fontSize: 12 }}>Unlimited</span>
                    )}
                  </td>

                  {/* Status */}
                  <td style={{ padding: "12px 14px" }}>
                    <button
                      onClick={() => handleToggle(link)}
                      style={{
                        background: link.isActive ? "rgba(68,214,44,0.15)" : "rgba(159,160,161,0.15)",
                        color:      link.isActive ? "#44d62c"              : "#9fa0a1",
                        borderRadius: 999, fontSize: 11, fontWeight: 700,
                        padding: "3px 9px", border: "none", cursor: "pointer",
                      }}
                    >
                      {link.isActive ? "Live" : "Hidden"}
                    </button>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <button onClick={() => { setEditing(link); setModal(true) }}
                        title="Edit"
                        style={{ padding: "6px 8px", borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", color: "#9fa0a1" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(100,117,209,0.12)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(link._id)}
                        title="Delete"
                        style={{ padding: "6px 8px", borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", color: "#ef4444" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.10)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
            <Loader2 className="animate-spin" color={ACCENT} />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <p style={{ textAlign: "center", padding: "48px 0", color: "#9fa0a1", fontSize: 13 }}>
            {links.length === 0 ? <>No manual links yet &mdash; click &ldquo;New Link&rdquo; to add the first one.</> : "No links match your search."}
          </p>
        )}
      </div>

      {/* Monitoring legend */}
      <div style={{ ...CARD, marginTop: 16, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <AlertTriangle size={16} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: "#9fa0a1", lineHeight: 1.6, margin: 0 }}>
            <strong style={{ color: "#b3bade" }}>Health ping</strong> (free) — every 24h the server sends a HEAD request to every link.
            A <span style={{ color: "#44d62c" }}>●</span> green dot means the page is alive.
            A <span style={{ color: "#ef4444" }}>●</span> red dot means the page returned 4xx/5xx — the link is probably dead or removed.
            HEAD requests transfer ~1KB per link and cost nothing.
          </p>
        </div>
      </div>

      {modalOpen && (
        <LinkModal
          editing={editing}
          onClose={() => { setModal(false); setEditing(null) }}
          onSaved={() => { setModal(false); setEditing(null); load() }}
        />
      )}
    </div>
  )
}

// ─── Create / Edit Modal ───────────────────────────────────────────────────────
function LinkModal({ editing, onClose, onSaved }: {
  editing: AdminManualLink | null
  onClose: () => void
  onSaved: () => void
}) {
  const [game, setGame] = useState<{ rawgId: string; rawgName: string } | null>(
    editing ? { rawgId: editing.rawgId, rawgName: editing.rawgName } : null,
  )
  const [form, setForm] = useState({
    label:             editing?.label             ?? "",
    url:               editing?.url               ?? "",
    platform:          (editing?.platform         ?? "all") as ManualLinkPlatform,
    price:             editing?.price != null      ? String(editing.price) : "",
    storeIcon:         editing?.storeIcon          ?? "",
    note:              editing?.note               ?? "",
    subscriptionName:  editing?.subscriptionName   ?? "",
    customSub:         "",
    discountExpiresAt: editing?.discountExpiresAt
      ? editing.discountExpiresAt.slice(0, 10) // yyyy-mm-dd for <input type="date">
      : "",
    isLimitedStock: editing?.isLimitedStock ?? false,
  })
  const [submitting,  setSubmitting]  = useState(false)
  const [analyzing,   setAnalyzing]   = useState(false)
  const [showIconPicker, setShowIconPicker] = useState(false)

  // ── AI auto-fill ──────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    const url = form.url.trim()
    if (!url) return toast.error("Paste a URL first, then click Analyze")
    if (!/^https?:\/\//i.test(url)) return toast.error("URL must start with https://")
    setAnalyzing(true)
    try {
      const data = await analyzeStoreLink(url)
      // Fill every field the AI returned
      setForm(f => ({
        ...f,
        label:             data.label            || f.label,
        platform:          (data.platform        || f.platform) as ManualLinkPlatform,
        price:             data.price != null     ? String(data.price) : f.price,
        storeIcon:         data.storeIcon        || f.storeIcon,
        subscriptionName:  data.subscriptionName || f.subscriptionName,
        discountExpiresAt: data.discountExpiresAt
          ? data.discountExpiresAt.slice(0, 10)
          : f.discountExpiresAt,
        note:              data.note             || f.note,
      }))
      // Set game if found and not already set
      if (data.rawgId && data.rawgName && !game) {
        setGame({ rawgId: String(data.rawgId), rawgName: data.rawgName })
      }
      toast.success("Form filled by AI — review and confirm")
    } catch (err) {
      toast.error((err as Error).message ?? "AI analysis failed")
    } finally {
      setAnalyzing(false)
    }
  }
  const [iconSearch, setIconSearch] = useState("")

  // RAWG game search
  const [gameQuery, setGameQuery]     = useState("")
  const [gameResults, setGameResults] = useState<Game[]>([])
  const [searching, setSearching]     = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runSearch = useCallback((value: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!value.trim()) { setGameResults([]); setShowResults(false); return }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await searchGames(value, 1)
        setGameResults(results.slice(0, 6))
        setShowResults(true)
      } catch { setGameResults([]) }
      finally { setSearching(false) }
    }, 380)
  }, [])

  const filteredIcons = iconSearch
    ? KNOWN_STORES.filter(s => s.name.toLowerCase().includes(iconSearch.toLowerCase()))
    : KNOWN_STORES

  const resolvedSub = form.subscriptionName === "__custom__"
    ? form.customSub
    : form.subscriptionName || null

  const handleSubmit = async () => {
    if (!game)              return toast.error("Pick a game first")
    if (!form.label.trim()) return toast.error("Enter a label")
    if (!form.url.trim())   return toast.error("Enter a URL")
    if (!/^https?:\/\//i.test(form.url.trim())) return toast.error("URL must start with http:// or https://")
    if (form.price !== "" && Number(form.price) < 0) return toast.error("Price cannot be negative")

    setSubmitting(true)
    try {
      const payload = {
        label:             form.label.trim(),
        url:               form.url.trim(),
        platform:          form.platform,
        price:             form.price === "" ? null : Number(form.price),
        storeIcon:         form.storeIcon.trim(),
        note:              form.note.trim(),
        subscriptionName:  resolvedSub || null,
        discountExpiresAt: form.discountExpiresAt || null,
        isLimitedStock:    form.isLimitedStock,
      }
      if (editing) {
        await updateGameLink(editing._id, payload)
        toast.success("Link updated")
      } else {
        await createGameLink({ rawgId: game.rawgId, rawgName: game.rawgName, ...payload })
        toast.success("Link created")
      }
      onSaved()
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? "Failed to save link")
    } finally { setSubmitting(false) }
  }

  const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "#9fa0a1", marginBottom: 6, letterSpacing: "0.04em" }
  const muted: React.CSSProperties = { fontSize: 11, color: "rgba(255,255,255,0.30)", fontWeight: 400 }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.65)" }}
      onClick={onClose}
    >
      <div
        style={{ width: "100%", maxWidth: 540, maxHeight: "92vh", overflowY: "auto", borderRadius: 16, background: "#1c1e2a", border: "1px solid rgba(31,37,57,0.9)", scrollbarWidth: "none" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 0" }}>
          <h2 style={{ color: "#fff", fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <Link2 size={17} color={ACCENT} />
            {editing ? "Edit Link" : "New Manual Link"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9fa0a1", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ── Game picker ── */}
          {editing || game ? (
            <div>
              <label style={labelStyle}>Game</label>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#12131a", border: "1px solid rgba(188,188,201,0.12)", borderRadius: 10, padding: "10px 14px" }}>
                <span style={{ color: "#fff", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  <Gamepad2 size={14} color={ACCENT} />
                  {game?.rawgName || `RAWG #${game?.rawgId}`}
                </span>
                {!editing && (
                  <button onClick={() => { setGame(null); setGameQuery("") }} style={{ background: "none", border: "none", color: "#9fa0a1", fontSize: 12, cursor: "pointer" }}>
                    Change
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <label style={labelStyle}>Game</label>
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9fa0a1" }} />
                <input
                  value={gameQuery}
                  onChange={e => { setGameQuery(e.target.value); runSearch(e.target.value) }}
                  onFocus={() => gameResults.length > 0 && setShowResults(true)}
                  placeholder="Search RAWG for a game…"
                  style={{ ...INPUT, paddingLeft: 36 }}
                />
                {searching && <Loader2 size={13} className="animate-spin" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#9fa0a1" }} />}
              </div>
              {showResults && gameResults.length > 0 && (
                <div style={{ position: "absolute", zIndex: 10, marginTop: 4, width: "100%", borderRadius: 10, background: "#1c1e2a", border: "1px solid rgba(31,37,57,0.8)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)", overflow: "hidden" }}>
                  {gameResults.map(g => (
                    <button
                      key={g.id}
                      onClick={() => { setGame({ rawgId: String(g.id), rawgName: g.name }); setShowResults(false) }}
                      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(100,117,209,0.10)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "none")}
                    >
                      {g.cover && <Image src={g.cover} alt="" width={28} height={38} style={{ borderRadius: 4, objectFit: "cover" }} />}
                      <span style={{ color: "#fff", fontSize: 13 }}>{g.name}</span>
                      {g.released && <span style={{ color: "#9fa0a1", fontSize: 11, marginLeft: "auto" }}>{g.released.slice(0, 4)}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Label ── */}
          <div>
            <label style={labelStyle}>Label</label>
            <input style={INPUT} value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="Buy on Rockstar Store" />
          </div>

          {/* ── URL + AI Analyze ── */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>URL</label>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing || !form.url.trim()}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: analyzing ? "rgba(100,117,209,0.10)" : "rgba(100,117,209,0.18)",
                  border: "1px solid rgba(100,117,209,0.40)",
                  borderRadius: 8, padding: "4px 12px",
                  fontSize: 12, fontWeight: 700, color: ACCENT,
                  cursor: analyzing || !form.url.trim() ? "not-allowed" : "pointer",
                  opacity: !form.url.trim() ? 0.45 : 1,
                  transition: "all 0.15s",
                }}
              >
                {analyzing
                  ? <><Loader2 size={12} className="animate-spin" /> Analyzing…</>
                  : <><Sparkles size={12} /> Analyze with AI</>}
              </button>
            </div>
            <input style={INPUT} value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              placeholder="https://store.steampowered.com/app/… or any store URL" />
            <p style={{ fontSize: 11, color: "#9fa0a1", marginTop: 5 }}>
              Paste a store URL and click <strong style={{ color: ACCENT }}>Analyze with AI</strong> — Claude will auto-fill all fields below.
            </p>
          </div>

          {/* ── Platform + Price ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Platform</label>
              <select style={{ ...INPUT, appearance: "none" }} value={form.platform}
                onChange={e => setForm(f => ({ ...f, platform: e.target.value as ManualLinkPlatform }))}>
                {PLATFORM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Price (USD) <span style={muted}>— blank = "Visit site"</span></label>
              <input type="number" min={0} step="0.01" style={INPUT} value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="19.99" />
            </div>
          </div>

          {/* ── Store icon quick-picker ── */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                Store Icon <span style={muted}>— click a store or paste a URL</span>
              </label>
              <button
                type="button"
                onClick={() => setShowIconPicker(v => !v)}
                style={{ background: "none", border: "none", cursor: "pointer", color: ACCENT, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}
              >
                {showIconPicker ? <><ChevronUp size={13} /> Hide picker</> : <><ChevronDown size={13} /> Pick from known stores</>}
              </button>
            </div>

            {showIconPicker && (
              <div style={{ marginBottom: 10 }}>
                <input
                  value={iconSearch}
                  onChange={e => setIconSearch(e.target.value)}
                  placeholder="Filter stores…"
                  style={{ ...INPUT, marginBottom: 10, fontSize: 12 }}
                />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 6, maxHeight: 260, overflowY: "auto", scrollbarWidth: "none" }}>
                  {filteredIcons.map(store => (
                    <button
                      key={store.name}
                      type="button"
                      onClick={() => {
                        setForm(f => ({
                          ...f,
                          storeIcon: store.icon,
                          label:     f.label || store.name,
                          platform:  store.platform ?? f.platform,
                        }))
                        setShowIconPicker(false)
                        setIconSearch("")
                      }}
                      title={store.name}
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                        padding: "8px 4px", borderRadius: 8, cursor: "pointer",
                        background: form.storeIcon === store.icon ? "rgba(100,117,209,0.18)" : "rgba(255,255,255,0.03)",
                        border: form.storeIcon === store.icon ? "1px solid rgba(100,117,209,0.4)" : "1px solid rgba(31,37,57,0.6)",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => { if (form.storeIcon !== store.icon) e.currentTarget.style.background = "rgba(255,255,255,0.06)" }}
                      onMouseLeave={e => { if (form.storeIcon !== store.icon) e.currentTarget.style.background = "rgba(255,255,255,0.03)" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={store.icon} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />
                      <span style={{ fontSize: 10, color: "#9fa0a1", textAlign: "center", lineHeight: 1.2, wordBreak: "break-word" }}>{store.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <input style={INPUT} value={form.storeIcon}
              onChange={e => setForm(f => ({ ...f, storeIcon: e.target.value }))}
              placeholder="https://…/favicon.png" />
            {form.storeIcon && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.storeIcon} alt="" style={{ width: 22, height: 22, objectFit: "contain", borderRadius: 4 }} />
                <span style={{ fontSize: 11, color: "#9fa0a1" }}>Preview</span>
              </div>
            )}
          </div>

          {/* ── Subscription ── */}
          <div>
            <label style={labelStyle}>
              Available via Subscription <span style={muted}>— leave blank if sold normally</span>
            </label>
            <select
              style={{ ...INPUT, appearance: "none" }}
              value={form.subscriptionName}
              onChange={e => setForm(f => ({ ...f, subscriptionName: e.target.value, customSub: "" }))}
            >
              <option value="">None (regular purchase / link)</option>
              {KNOWN_SUBS.map(s => <option key={s} value={s}>{s}</option>)}
              <option value="__custom__">Other (type below)…</option>
            </select>
            {form.subscriptionName === "__custom__" && (
              <input
                style={{ ...INPUT, marginTop: 8 }}
                value={form.customSub}
                onChange={e => setForm(f => ({ ...f, customSub: e.target.value }))}
                placeholder="e.g. Ubisoft+ Classics"
              />
            )}
          </div>

          {/* ── Discount Expiry ── */}
          <div>
            <label style={labelStyle}>
              Discount Ends On
              <span style={{ ...muted, marginLeft: 6, background: "rgba(68,214,44,0.12)", color: "#44d62c", borderRadius: 999, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
                💡 FREE — set this instead of AI tracking
              </span>
            </label>
            <input
              type="date"
              style={{ ...INPUT, colorScheme: "dark" }}
              value={form.discountExpiresAt}
              onChange={e => setForm(f => ({ ...f, discountExpiresAt: e.target.value }))}
            />
            {form.discountExpiresAt && (() => {
              const dl = Math.ceil((new Date(form.discountExpiresAt).getTime() - Date.now()) / 86_400_000)
              return dl > 0
                ? <p style={{ fontSize: 11, color: "#44d62c", marginTop: 5 }}>⏱ {dl} day{dl !== 1 ? "s" : ""} until auto-expiry</p>
                : <p style={{ fontSize: 11, color: "#ef4444", marginTop: 5 }}>⚠ This date is in the past — link will be hidden immediately.</p>
            })()}
          </div>

          {/* ── Limited Stock ── */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <button
              type="button"
              role="checkbox"
              aria-checked={form.isLimitedStock}
              onClick={() => setForm(f => ({ ...f, isLimitedStock: !f.isLimitedStock }))}
              style={{
                width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
                border: `2px solid ${form.isLimitedStock ? ACCENT : "rgba(188,188,201,0.30)"}`,
                background: form.isLimitedStock ? ACCENT : "transparent",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {form.isLimitedStock && <span style={{ color: "#fff", fontSize: 12, lineHeight: 1, fontWeight: 700 }}>✓</span>}
            </button>
            <div>
              <p style={{ color: "#fff", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <Package size={13} color="#F59E0B" /> Limited Stock
              </p>
              <p style={{ color: "#9fa0a1", fontSize: 11, marginTop: 2, lineHeight: 1.5 }}>
                Show a &ldquo;Limited&rdquo; badge on this link. When stock runs out,
                toggle it to &ldquo;Out of stock&rdquo; from the table — the link hides automatically.
              </p>
            </div>
          </div>

          {/* ── Note ── */}
          <div>
            <label style={labelStyle}>Note <span style={muted}>— shown below store name (optional)</span></label>
            <input style={INPUT} value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Requires Rockstar Launcher · Activate on GOG" />
          </div>

          {/* ── Actions ── */}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              onClick={onClose}
              style={{ flex: 1, borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 600, color: "#9fa0a1", background: "rgba(255,255,255,0.05)", border: "none", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{ flex: 1, borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 700, color: "#fff", background: ACCENT, border: "none", cursor: "pointer", opacity: submitting ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {editing ? "Save Changes" : "Add Link"}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
