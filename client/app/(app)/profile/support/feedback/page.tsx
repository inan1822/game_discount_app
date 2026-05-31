"use client"

import { useState } from "react"
import { toast } from "react-toastify"
import { useAuth } from "@/context/AuthContext"
import ProfileSubLayout from "@/components/profile/ProfileSubLayout"
import { submitFeedback } from "@/lib/api/support"

const cardStyle = {
  background: "rgba(28,30,42,0.70)",
  border: "1px solid rgba(255,255,255,0.05)",
  borderRadius: 10,
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
} as const

export default function FeedbackPage() {
  const { user } = useAuth()
  const [text,        setText]        = useState("")
  const [email,       setEmail]       = useState(user?.email ?? "")
  const [submitting,  setSubmitting]  = useState(false)
  const [submitted,   setSubmitted]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (text.trim().length < 10) { toast.error("Please write at least 10 characters"); return }
    setSubmitting(true)
    try {
      await submitFeedback({ text: text.trim(), email: email.trim() || undefined })
      setSubmitted(true)
      toast.success("Feedback sent — thank you!")
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      if (msg?.includes("429") || (err as { response?: { status?: number } })?.response?.status === 429) {
        toast.error("You've sent 3 messages this hour. Please wait before submitting again.")
      } else {
        toast.error(msg ?? "Failed to send feedback")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ProfileSubLayout title="Send Feedback" backHref="/profile">
      {submitted ? (
        <div style={cardStyle} className="p-8 text-center space-y-3">
          <p className="text-3xl">🎉</p>
          <p className="text-white font-semibold text-[15px]">Thanks for your feedback!</p>
          <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.45)" }}>
            We read every message. Your input helps make DisLow better.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={cardStyle} className="p-6 space-y-5">
          <div>
            <label className="block text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              Your feedback
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Tell us what you think, what you'd like to see, or what could be better…"
              rows={6}
              maxLength={5000}
              className="w-full text-[13px] outline-none resize-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                padding: "10px 14px",
                color: "white",
              }}
            />
            <p className="text-right text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
              {text.length}/5000
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              Email (optional — if you want a reply)
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
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

          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            Limited to 3 submissions per hour.
          </p>

          <button
            type="submit"
            disabled={submitting || text.trim().length < 10}
            className="w-full py-2.5 text-[14px] font-semibold transition-opacity disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#AE3BD6,#6475D1)", borderRadius: 10, border: "none", color: "white", cursor: submitting ? "wait" : "pointer" }}
          >
            {submitting ? "Sending…" : "Send Feedback"}
          </button>
        </form>
      )}
    </ProfileSubLayout>
  )
}
