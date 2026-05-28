"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-toastify"
import { useAuth } from "@/context/AuthContext"
import ProfileSubLayout from "@/components/profile/ProfileSubLayout"
import { editProfile, confirmPendingEmail } from "@/lib/api/users"

const cardStyle = {
  background: "rgba(28,30,42,0.70)",
  border: "1px solid rgba(255,255,255,0.05)",
  borderRadius: 14,
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
} as const

function Field({
  label, value, onChange, type = "text", placeholder, disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full text-[14px] outline-none transition-colors"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10,
          padding: "10px 14px",
          color: disabled ? "rgba(255,255,255,0.35)" : "white",
          cursor: disabled ? "not-allowed" : "text",
        }}
      />
    </div>
  )
}

export default function EditProfilePage() {
  const router = useRouter()
  const { user, isLoading, updateUser } = useAuth()

  const [name,            setName]            = useState("")
  const [email,           setEmail]           = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [submitting,      setSubmitting]      = useState(false)

  // Pending email confirm flow
  const [awaitingCode, setAwaitingCode] = useState(false)
  const [code,         setCode]         = useState("")
  const [confirming,   setConfirming]   = useState(false)

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login")
  }, [isLoading, user, router])

  useEffect(() => {
    if (user) {
      setName(user.name ?? "")
      setEmail(user.email ?? "")
      if (user.pendingEmail) setAwaitingCode(true)
    }
  }, [user?._id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!currentPassword) { toast.error("Current password is required"); return }

    const payload: { name?: string; email?: string; currentPassword: string } = { currentPassword }
    if (name.trim() && name !== user.name)   payload.name  = name.trim()
    if (email.trim() && email !== user.email) payload.email = email.trim()

    if (!payload.name && !payload.email) { toast.info("Nothing to update"); return }

    setSubmitting(true)
    try {
      const result = await editProfile(payload)
      if (result.emailChangePending) {
        setAwaitingCode(true)
        toast.success("Check your new email for the verification code")
      } else {
        if (payload.name)  updateUser({ name: payload.name })
        if (payload.email) updateUser({ email: payload.email })
        toast.success("Profile updated")
        router.push("/profile")
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to update profile"
      toast.error(msg)
    } finally {
      setSubmitting(false)
      setCurrentPassword("")
    }
  }

  const handleConfirmCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setConfirming(true)
    try {
      const updated = await confirmPendingEmail(code)
      updateUser({ email: updated.email, pendingEmail: undefined })
      toast.success("Email updated successfully")
      router.push("/profile")
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Invalid or expired code"
      toast.error(msg)
    } finally {
      setConfirming(false)
    }
  }

  if (isLoading || !user) return null

  return (
    <ProfileSubLayout title="Edit Profile">
      {awaitingCode ? (
        /* ── Confirm pending email ── */
        <div style={cardStyle} className="p-6 space-y-5">
          <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>
            A 6-digit code was sent to{" "}
            <span className="text-white font-semibold">{user.pendingEmail ?? email}</span>.
            Enter it below to confirm your new email address.
          </p>

          <form onSubmit={handleConfirmCode} className="space-y-5">
            <Field label="Verification code" value={code} onChange={setCode} placeholder="123456" />

            <button
              type="submit"
              disabled={confirming || code.length < 6}
              className="w-full py-2.5 text-[14px] font-semibold transition-opacity disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg,#AE3BD6,#6475D1)",
                borderRadius: 10,
                border: "none",
                color: "white",
                cursor: confirming ? "wait" : "pointer",
              }}
            >
              {confirming ? "Verifying…" : "Confirm Email"}
            </button>
          </form>

          <button
            onClick={() => setAwaitingCode(false)}
            className="w-full text-center text-[12px] transition-colors hover:text-white"
            style={{ color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer" }}
          >
            ← Go back and change a different field
          </button>
        </div>
      ) : (
        /* ── Edit form ── */
        <form onSubmit={handleSubmit} style={cardStyle} className="p-6 space-y-5">
          <Field label="Display name" value={name} onChange={setName} placeholder="Your name" />
          <Field label="Email address" value={email} onChange={setEmail} type="email" placeholder="you@example.com" />
          <Field
            label="Current password (required)"
            value={currentPassword}
            onChange={setCurrentPassword}
            type="password"
            placeholder="Enter your current password"
          />

          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
            Your password is required to save any changes.
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 text-[14px] font-semibold transition-opacity disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg,#AE3BD6,#6475D1)",
              borderRadius: 10,
              border: "none",
              color: "white",
              cursor: submitting ? "wait" : "pointer",
            }}
          >
            {submitting ? "Saving…" : "Save Changes"}
          </button>
        </form>
      )}
    </ProfileSubLayout>
  )
}
