"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Eye, EyeOff } from "lucide-react"
import { toast } from "react-toastify"
import { useAuth } from "@/features/auth/state/AuthContext"
import { AuthPageShell } from "@/components/auth/AuthPageShell"
import { SparkleButton } from "@/shared/components/SparkleButton"

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut", delay },
})

function SocialBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1.5 group">
      <span className="w-6 h-6 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
        {icon}
      </span>
      <span className="text-xs text-[#9fa0a1] group-hover:text-white transition-colors">{label}</span>
    </button>
  )
}

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)
const SteamIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.455 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.662 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.252 0-2.265-1.014-2.265-2.265z"/>
  </svg>
)
const DiscordIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#5865F2">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.01.104.058.198.128.263a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
  </svg>
)

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()

  const [form, setForm]                 = useState({ name: "", email: "", password: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]           = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await register(form.name, form.email, form.password)
      toast.success("Account created! Check your email to verify. 🎮")
      router.push("/verify-email?email=" + encodeURIComponent(form.email))
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

  const handleSocialLogin = (provider: "google" | "steam" | "discord") => {
    if (provider === "discord") {
      window.location.href = `${API}/api/v1/auth/discord`
      return
    }
    if (provider === "steam") {
      window.location.href = `${API}/api/v1/auth/steam`
      return
    }
    window.location.href = `${API}/api/v1/auth/google`
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
          <motion.div className="mb-6" {...fadeUp(0.2)}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
              Create account
            </h1>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div {...fadeUp(0.3)}>
              <input
                type="text"
                placeholder="Username"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                required
                minLength={2}
                maxLength={40}
                className="auth-input"
              />
            </motion.div>

            <motion.div {...fadeUp(0.35)}>
              <input
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required
                className="auth-input"
              />
            </motion.div>

            <motion.div {...fadeUp(0.4)}>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
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

            <motion.div className="flex justify-center gap-8 pt-1 pb-1" {...fadeUp(0.70)}>
              <SocialBtn icon={<GoogleIcon />}  label="Google"  onClick={() => handleSocialLogin("google")} />
              <SocialBtn icon={<SteamIcon />}   label="Steam"   onClick={() => handleSocialLogin("steam")} />
              <SocialBtn icon={<DiscordIcon />} label="Discord" onClick={() => handleSocialLogin("discord")} />
            </motion.div>

            <motion.div {...fadeUp(0.85)} className="pt-1">
              <SparkleButton label="Create account" type="submit" loading={loading} />
            </motion.div>
          </form>

          <motion.p className="text-center mt-4" style={{ fontSize: 13, color: "#9fa0a1" }} {...fadeUp(0.92)}>
            already have an account?{" "}
            <Link href="/login" className="font-semibold hover:text-white transition-colors" style={{ color: "#999FFA" }}>
              login
            </Link>
          </motion.p>
        </div>
      </motion.div>
    </AuthPageShell>
  )
}
