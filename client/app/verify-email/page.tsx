"use client"

import { useRef, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { toast } from "react-toastify"
import { SparkleButton } from "@/components/ui/SparkleButton"
import { AuthPageShell } from "@/components/auth/AuthPageShell"
import apiClient from "@/lib/api/axios"

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut", delay },
})

const CODE_LENGTH = 6

export default function VerifyEmailPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const email        = searchParams.get("email") ?? ""

  const [digits, setDigits]       = useState<string[]>(Array(CODE_LENGTH).fill(""))
  const [loading, setLoading]     = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown]   = useState(0)
  const inputRefs                 = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => { inputRefs.current[0]?.focus() }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  const handleChange = (idx: number, val: string) => {
    if (val.length > 1) {
      const cleaned = val.replace(/\D/g, "").slice(0, CODE_LENGTH)
      const next = [...digits]
      for (let i = 0; i < CODE_LENGTH; i++) next[i] = cleaned[i] ?? ""
      setDigits(next)
      inputRefs.current[Math.min(cleaned.length, CODE_LENGTH - 1)]?.focus()
      return
    }
    if (!/^\d?$/.test(val)) return
    const next = [...digits]
    next[idx] = val
    setDigits(next)
    if (val && idx < CODE_LENGTH - 1) inputRefs.current[idx + 1]?.focus()
  }

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = digits.join("")
    if (code.length < CODE_LENGTH) { toast.error("Enter all 6 digits"); return }
    setLoading(true)
    try {
      await apiClient.post("/auth/verify", { email, code })
      toast.success("Email verified! Welcome to DisLow 🎮")
      router.push("/login")
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Invalid code")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || !email) return
    setResending(true)
    try {
      await apiClient.post("/auth/resend-verify", { email })
      toast.success("New code sent!")
      setCooldown(60)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not resend")
    } finally {
      setResending(false)
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
          <motion.div className="mb-2" {...fadeUp(0.2)}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
              Verify your email
            </h1>
          </motion.div>

          <motion.p
            className="mb-7 leading-relaxed"
            style={{ fontSize: 13, color: "#9fa0a1" }}
            {...fadeUp(0.28)}
          >
            We sent a 6-digit code to{" "}
            <span className="text-white font-semibold">{email || "your email"}</span>.
            Enter it below to activate your account.
          </motion.p>

          <form onSubmit={handleSubmit}>
            {/* OTP boxes */}
            <motion.div className="flex gap-3 justify-center mb-7" {...fadeUp(0.36)}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={d}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className="w-11 h-14 text-center text-xl font-bold text-white outline-none transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: d
                      ? "1px solid rgba(174,59,214,0.65)"
                      : "1px solid rgba(188,188,201,0.15)",
                    borderRadius: 10,
                    caretColor: "#AE3BD6",
                  }}
                />
              ))}
            </motion.div>

            <motion.div {...fadeUp(0.52)}>
              <SparkleButton label="Verify email" type="submit" loading={loading} />
            </motion.div>
          </form>

          <motion.p
            className="text-center mt-5"
            style={{ fontSize: 13, color: "#9fa0a1" }}
            {...fadeUp(0.60)}
          >
            didn't receive it?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || resending || !email}
              className="font-semibold transition-colors disabled:opacity-40"
              style={{ color: "#999FFA" }}
            >
              {resending ? "sending..." : cooldown > 0 ? `resend in ${cooldown}s` : "resend code"}
            </button>
          </motion.p>

          <motion.p
            className="text-center mt-3"
            style={{ fontSize: 13, color: "#9fa0a1" }}
            {...fadeUp(0.66)}
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
