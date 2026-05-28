"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-toastify"
import { Trash2, AlertTriangle } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import ProfileSubLayout from "@/components/profile/ProfileSubLayout"
import { deleteAccount } from "@/lib/api/users"

const CONFIRM_PHRASE = "Dont Delete Me :("

const cardStyle = {
  background: "rgba(28,30,42,0.70)",
  border: "1px solid rgba(255,255,255,0.05)",
  borderRadius: 14,
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
} as const

const inputStyle = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  padding: "10px 14px",
  color: "white",
  width: "100%",
  fontSize: 13,
  outline: "none",
} as const

export default function DeletePage() {
  const router = useRouter()
  const { logout } = useAuth()
  const [password, setPassword]       = useState("")
  const [phrase, setPhrase]           = useState("")
  const [submitting, setSubmitting]   = useState(false)

  const phraseMatch = phrase === CONFIRM_PHRASE
  const canSubmit   = password.length > 0 && phraseMatch

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await deleteAccount({ password, confirmPhrase: phrase })
      toast.success("Account deleted. Goodbye.")
      logout()
      router.replace("/")
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      const msg    = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      if (status === 429) {
        toast.error("Too many attempts. Try again tomorrow.")
      } else {
        toast.error(msg ?? "Failed to delete account. Please try again.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ProfileSubLayout title="Delete Account" backHref="/profile">
      <form onSubmit={handleDelete} className="space-y-4">

        {/* Warning banner */}
        <div
          className="flex gap-3 items-start rounded-[10px] px-4 py-3"
          style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)" }}
        >
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
          <div className="space-y-1">
            <p className="text-[13px] font-semibold" style={{ color: "#ef4444" }}>
              This action is permanent and cannot be undone
            </p>
            <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.5)" }}>
              Your account, wishlist, and notifications will be deleted.
              Feedback and bug reports you submitted will be anonymised.
            </p>
          </div>
        </div>

        {/* Fields card */}
        <div style={cardStyle} className="p-6 space-y-5">

          {/* Password */}
          <div>
            <label
              className="block text-[11px] font-semibold tracking-widest uppercase mb-1.5"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Your password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your current password"
              autoComplete="current-password"
              style={inputStyle}
            />
          </div>

          {/* Confirm phrase */}
          <div>
            <label
              className="block text-[11px] font-semibold tracking-widest uppercase mb-1.5"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Type to confirm
            </label>
            <p className="text-[12px] mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
              Type exactly:{" "}
              <code style={{ color: "rgba(255,255,255,0.75)" }}>{CONFIRM_PHRASE}</code>
            </p>
            <input
              type="text"
              value={phrase}
              onChange={e => setPhrase(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              style={{
                ...inputStyle,
                borderColor: phrase.length > 0
                  ? phraseMatch
                    ? "rgba(68,214,44,0.4)"
                    : "rgba(239,68,68,0.4)"
                  : "rgba(255,255,255,0.08)",
              }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="w-full flex items-center justify-center gap-2 py-3 text-[14px] font-semibold transition-opacity disabled:opacity-40"
            style={{
              background: canSubmit
                ? "linear-gradient(135deg,#ef4444,#b91c1c)"
                : "rgba(239,68,68,0.25)",
              borderRadius: 10,
              border: "none",
              color: "white",
              cursor: !canSubmit || submitting ? "not-allowed" : "pointer",
            }}
          >
            <Trash2 size={15} />
            {submitting ? "Deleting…" : "Delete My Account"}
          </button>
        </div>
      </form>
    </ProfileSubLayout>
  )
}
