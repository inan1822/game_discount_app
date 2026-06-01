"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { toast } from "react-toastify"
import { SparkleButton } from "@/shared/components/SparkleButton"
import { AuthPageShell } from "@/components/auth/AuthPageShell"
import apiClient from "@/shared/services/axios"

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut", delay },
})

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await apiClient.post("/auth/request-password-reset", { email })
      setSent(true)
      toast.success("Reset link sent! Check your inbox.")
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPageShell>
      <motion.div
        className="w-full"
        style={{ maxWidth: 467 }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Logo */}
        <motion.div {...fadeUp(0.1)} className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-4">
            <img src="/icons/logo.svg" alt="" style={{ width: 54, height: 54 }} />
            <img src="/icons/logo-text.svg" alt="DisLow" style={{ height: 52, width: "auto" }} />
          </div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.40)", marginTop: 8 }}>
            Track deals. Catch events. Never miss a drop.
          </p>
        </motion.div>

        {/* Glass card */}
        <div
          style={{
            background: "rgba(43, 48, 89, 0.70)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            borderRadius: 10,
            padding: "40px 44px",
          }}
        >
          {!sent ? (
            <>
              <motion.div className="mb-2" {...fadeUp(0.2)}>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
                  Forgot password?
                </h1>
              </motion.div>

              <motion.p
                className="mb-6 leading-relaxed"
                style={{ fontSize: 13, color: "#9fa0a1" }}
                {...fadeUp(0.28)}
              >
                No worries — enter your email and we'll send you a reset link.
              </motion.p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <motion.div {...fadeUp(0.36)}>
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="auth-input"
                  />
                </motion.div>

                <motion.div {...fadeUp(0.52)} className="pt-1">
                  <SparkleButton label="Send reset link" type="submit" loading={loading} />
                </motion.div>
              </form>
            </>
          ) : (
            /* ── Success state ── */
            <motion.div
              className="text-center py-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: "rgba(174,59,214,0.15)", border: "1px solid rgba(174,59,214,0.3)" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="#AE3BD6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
                Check your inbox
              </h2>
              <p className="leading-relaxed mb-6" style={{ fontSize: 13, color: "#9fa0a1" }}>
                We sent a reset link to{" "}
                <span className="text-white font-semibold">{email}</span>.
                It expires in 1 hour.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="text-sm font-semibold transition-colors hover:text-white"
                style={{ color: "#999FFA" }}
              >
                Try a different email
              </button>
            </motion.div>
          )}

          {/* Back to login */}
          <motion.p
            className="text-center mt-6"
            style={{ fontSize: 13, color: "#9fa0a1" }}
            {...fadeUp(0.60)}
          >
            <Link href="/login" className="hover:text-white transition-colors" style={{ color: "#9fa0a1" }}>
              ← back to login
            </Link>
          </motion.p>
        </div>
      </motion.div>
    </AuthPageShell>
  )
}
