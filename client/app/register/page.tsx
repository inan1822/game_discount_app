"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { toast } from "react-toastify"
import { Eye, EyeOff } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await register(form.name, form.email, form.password)
      toast.success("Account created! Check your email to verify 📧")
      router.push("/login")
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6">

      {/* Background blobs */}
      <div className="blob-purple w-64 h-64 -top-20 -right-20" />
      <div className="blob-blue w-72 h-72 -bottom-10 -left-10" />

      {/* Logo */}
      <div className="relative z-10 mb-10 mt-16 text-center">
        <h1 className="text-4xl font-bold text-gradient tracking-tight">⊙DisLow</h1>
        <p className="text-[#9fa0a1] text-sm mt-2">Create your account</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="relative z-10 w-full space-y-4">

        {/* Name */}
        <div className="glass rounded-full px-5 py-4">
          <input
            type="text"
            placeholder="Full Name"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            required
            minLength={2}
            className="w-full bg-transparent text-white placeholder-[#9fa0a1] outline-none text-base"
          />
        </div>

        {/* Email */}
        <div className="glass rounded-full px-5 py-4">
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            required
            className="w-full bg-transparent text-white placeholder-[#9fa0a1] outline-none text-base"
          />
        </div>

        {/* Password */}
        <div className="glass rounded-full px-5 py-4 flex items-center gap-3">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password (min 8 chars)"
            value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            required
            minLength={8}
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

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-full font-bold text-white text-lg mt-4 transition-all disabled:opacity-60 glow-purple"
          style={{ background: "linear-gradient(135deg, #AE3BD6, #6475D1)" }}
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>

        <p className="text-center text-sm text-[#9fa0a1] mt-2">
          already have an account?{" "}
          <Link href="/login" className="text-[#999FFA] hover:text-white transition-colors font-semibold">
            login
          </Link>
        </p>
      </form>
    </div>
  )
}
