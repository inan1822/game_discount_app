"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { toast } from "react-toastify"
import { Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: "", password: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [remember, setRemember] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.success("Welcome back! 🎮")
      router.push("/")
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6">

      {/* Background blobs */}
      <div className="blob-purple w-64 h-64 -top-20 -left-20" />
      <div className="blob-blue w-72 h-72 -bottom-10 -right-10" />

      {/* Game art header strip (matches Figma top section) */}
      <div className="absolute top-0 left-0 right-0 h-48 overflow-hidden">
        <div className="w-full h-full bg-gradient-to-b from-[#1c1e2a] to-transparent" />
      </div>

      {/* Logo */}
      <div className="relative z-10 mb-12 mt-16 text-center">
        <h1 className="text-4xl font-bold text-gradient tracking-tight">
          ⊙DisLow
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="relative z-10 w-full space-y-4">

        {/* Email */}
        <div className="glass rounded-full px-5 py-4 flex items-center gap-3">
          <input
            type="email"
            placeholder="Username / Email"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            required
            className="flex-1 bg-transparent text-white placeholder-[#9fa0a1] outline-none text-base"
          />
        </div>

        {/* Password */}
        <div className="glass rounded-full px-5 py-4 flex items-center gap-3">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            required
            className="flex-1 bg-transparent text-white placeholder-[#9fa0a1] outline-none text-base"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-[#9fa0a1] hover:text-white transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Remember + Forgot */}
        <div className="flex items-center justify-between px-1">
          <label className="flex items-center gap-2 text-sm text-[#9fa0a1] cursor-pointer">
            <div
              onClick={() => setRemember(!remember)}
              className={`w-5 h-5 rounded-full border-2 transition-all cursor-pointer ${
                remember
                  ? "bg-[#AE3BD6] border-[#AE3BD6]"
                  : "border-[rgba(188,188,201,0.5)] bg-transparent"
              }`}
            />
            remember
          </label>
          <Link href="/forgot-password" className="text-sm text-[#9fa0a1] hover:text-white transition-colors">
            forgot password?
          </Link>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-[rgba(188,188,201,0.2)]" />
          <span className="text-xs text-[#9fa0a1]">Or sign in with</span>
          <div className="flex-1 h-px bg-[rgba(188,188,201,0.2)]" />
        </div>

        {/* Social login icons */}
        <div className="flex justify-center gap-6">
          {/* Google */}
          <button type="button" className="w-12 h-12 glass rounded-full flex items-center justify-center hover:glow-purple transition-all">
            <svg width="22" height="22" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </button>

          {/* Steam */}
          <button type="button" className="w-12 h-12 glass rounded-full flex items-center justify-center hover:glow-blue transition-all">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.455 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.662 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.252 0-2.265-1.014-2.265-2.265z"/>
            </svg>
          </button>

          {/* Discord */}
          <button type="button" className="w-12 h-12 glass rounded-full flex items-center justify-center hover:glow-purple transition-all">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#5865F2">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.01.104.058.198.128.263a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
            </svg>
          </button>
        </div>

        {/* Login button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-full font-bold text-white text-lg mt-4 transition-all disabled:opacity-60 glow-purple"
          style={{
            background: "linear-gradient(135deg, #AE3BD6, #6475D1)"
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* Register link */}
        <p className="text-center text-sm text-[#9fa0a1] mt-2">
          don&apos;t have an account?{" "}
          <Link href="/register" className="text-[#999FFA] hover:text-white transition-colors font-semibold">
            register
          </Link>
        </p>
      </form>
    </div>
  )
}
