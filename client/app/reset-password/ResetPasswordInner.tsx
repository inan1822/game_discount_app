"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Eye, EyeOff } from "lucide-react"
import { toast } from "react-toastify"
import { SparkleButton } from "@/shared/components/SparkleButton"
import { AuthPageShell } from "@/components/auth/AuthPageShell"
import apiClient from "@/shared/services/axios"

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut", delay },
})

export default function ResetPasswordInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const token        = searchParams.get("token") ?? ""

  const [form, setForm]                 = useState({ password: "", confirm: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [loading, setLoading]           = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm) { toast.error("Passwords don't match"); return }
    if (form.password.length < 8) { toast.error("Password must be at least 8 characters"); return }
    if (!token) { toast.error("Invalid or missing reset token"); return }
    setLoading(true)
    try {
      await apiClient.post("/auth/reset-password", {
        token,
        newPassword: form.password,
        confirmPassword: form.confirm,
      })
      toast.success("Password updated! You can now log in.")
      router.push("/login")
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Reset failed — link may have expired")
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
          <motion.div className="mb-2" {...fadeUp(0.2)}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
              Reset password
            </h1>
          </motion.div>

          <motion.p
            className="mb-6 leading-relaxed"
            style={{ fontSize: 13, color: "#9fa0a1" }}
            {...fadeUp(0.28)}
          >
            Choose a new password for your DisLow account.
          </motion.p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New password */}
            <motion.div {...fadeUp(0.36)}>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="New password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                  minLength={8}
                  className="auth-input pr-12"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9fa0a1] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </motion.div>

            {/* Confirm password */}
            <motion.div {...fadeUp(0.44)}>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm password"
                  value={form.confirm}
                  onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                  required
                  minLength={8}
                  className="auth-input pr-12"
                  style={{
                    borderColor:
                      form.confirm && form.confirm !== form.password
                        ? "rgba(239,68,68,0.6)"
                        : undefined,
                  }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9fa0a1] hover:text-white transition-colors"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.confirm && form.confirm !== form.password && (
                <p className="text-xs mt-1.5 ml-1" style={{ color: "#ef4444" }}>
                  Passwords don't match
                </p>
              )}
            </motion.div>

            <motion.div {...fadeUp(0.58)} className="pt-1">
              <SparkleButton label="Set new password" type="submit" loading={loading} />
            </motion.div>
          </form>

          <motion.p
            className="text-center mt-6"
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
