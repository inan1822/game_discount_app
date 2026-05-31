"use client"

import { useState } from "react"
import { toast } from "react-toastify"
import { useAuth } from "@/context/AuthContext"
import ProfileSubLayout from "@/components/profile/ProfileSubLayout"
import { submitBug } from "@/lib/api/support"

const cardStyle = {
  background: "rgba(28,30,42,0.70)",
  border: "1px solid rgba(255,255,255,0.05)",
  borderRadius: 10,
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
} as const

function TextArea({ label, value, onChange, placeholder, rows = 4, max = 5000 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; max?: number
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={max}
        className="w-full text-[13px] outline-none resize-none"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", color: "white" }}
      />
    </div>
  )
}

export default function BugPage() {
  const { user } = useAuth()
  const [steps,       setSteps]       = useState("")
  const [expected,    setExpected]    = useState("")
  const [device,      setDevice]      = useState("")
  const [email,       setEmail]       = useState(user?.email ?? "")
  const [submitting,  setSubmitting]  = useState(false)
  const [submitted,   setSubmitted]   = useState(false)

  const valid = steps.trim().length >= 10 && expected.trim().length >= 5 && device.trim().length >= 2

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setSubmitting(true)
    try {
      await submitBug({ steps: steps.trim(), expected: expected.trim(), device: device.trim(), email: email.trim() || undefined })
      setSubmitted(true)
      toast.success("Bug report sent — thank you!")
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      const msg    = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(status === 429 ? "Too many submissions this hour. Please wait." : (msg ?? "Failed to send report"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ProfileSubLayout title="Report a Bug" backHref="/profile">
      {submitted ? (
        <div style={cardStyle} className="p-8 text-center space-y-3">
          <p className="text-3xl">🐞</p>
          <p className="text-white font-semibold text-[15px]">Bug report received!</p>
          <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.45)" }}>
            We'll investigate and fix it as soon as possible.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={cardStyle} className="p-6 space-y-5">
          <TextArea
            label="Steps to reproduce"
            value={steps}
            onChange={setSteps}
            placeholder={"1. Go to game detail page\n2. Click 'Visit Game Store'\n3. …"}
            rows={5}
          />
          <TextArea
            label="Expected behavior"
            value={expected}
            onChange={setExpected}
            placeholder="What should have happened?"
            rows={3}
            max={2000}
          />
          <div>
            <label className="block text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              Browser / device
            </label>
            <input
              type="text"
              value={device}
              onChange={e => setDevice(e.target.value)}
              placeholder="e.g. Chrome 124, Windows 11 / Safari 17, iPhone 15"
              maxLength={300}
              className="w-full text-[13px] outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", color: "white" }}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              Email (optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full text-[13px] outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", color: "white" }}
            />
          </div>

          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>Limited to 3 reports per hour.</p>

          <button
            type="submit"
            disabled={submitting || !valid}
            className="w-full py-2.5 text-[14px] font-semibold transition-opacity disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#AE3BD6,#6475D1)", borderRadius: 10, border: "none", color: "white", cursor: submitting ? "wait" : "pointer" }}
          >
            {submitting ? "Sending…" : "Submit Report"}
          </button>
        </form>
      )}
    </ProfileSubLayout>
  )
}
