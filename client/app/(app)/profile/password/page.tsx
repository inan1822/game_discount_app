"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-toastify"
import { useAuth } from "@/context/AuthContext"
import ProfileSubLayout from "@/components/profile/ProfileSubLayout"
import { changePassword } from "@/lib/api/users"

const cardStyle = {
  background: "rgba(28,30,42,0.70)",
  border: "1px solid rgba(255,255,255,0.05)",
  borderRadius: 10,
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
} as const

function Field({
  label, value, onChange, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
        {label}
      </label>
      <input
        type="password"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-[14px] outline-none"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10,
          padding: "10px 14px",
          color: "white",
        }}
      />
    </div>
  )
}

export default function ChangePasswordPage() {
  const router = useRouter()
  const { user, isLoading, logout } = useAuth()

  const [currentPassword,    setCurrentPassword]    = useState("")
  const [newPassword,        setNewPassword]        = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [submitting,         setSubmitting]         = useState(false)

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login")
  }, [isLoading, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmNewPassword) { toast.error("Passwords do not match"); return }
    if (newPassword.length < 8)             { toast.error("Password must be at least 8 characters"); return }
    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(newPassword)) {
      toast.error("Password must contain at least one letter and one digit")
      return
    }

    setSubmitting(true)
    try {
      await changePassword({ currentPassword, newPassword, confirmNewPassword })
      toast.success("Password changed. Please log in again.")
      await logout()
      router.replace("/login")
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to change password"
      toast.error(msg)
      setSubmitting(false)
    }
  }

  if (isLoading || !user) return null

  return (
    <ProfileSubLayout title="Change Password">
      <form onSubmit={handleSubmit} style={cardStyle} className="p-6 space-y-5">
        <Field
          label="Current password"
          value={currentPassword}
          onChange={setCurrentPassword}
          placeholder="Your current password"
        />
        <Field
          label="New password"
          value={newPassword}
          onChange={setNewPassword}
          placeholder="Min 8 chars, 1 letter + 1 digit"
        />
        <Field
          label="Confirm new password"
          value={confirmNewPassword}
          onChange={setConfirmNewPassword}
          placeholder="Repeat new password"
        />

        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
          After changing your password you will be logged out of all sessions.
        </p>

        <button
          type="submit"
          disabled={submitting || !currentPassword || !newPassword || !confirmNewPassword}
          className="w-full py-2.5 text-[14px] font-semibold transition-opacity disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg,#AE3BD6,#6475D1)",
            borderRadius: 10,
            border: "none",
            color: "white",
            cursor: submitting ? "wait" : "pointer",
          }}
        >
          {submitting ? "Changing…" : "Change Password"}
        </button>
      </form>
    </ProfileSubLayout>
  )
}
