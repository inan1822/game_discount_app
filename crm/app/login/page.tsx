"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-toastify"
import axios from "axios"
import { Eye, EyeOff, Shield, Loader2 } from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

const PANEL: React.CSSProperties = {
  background:           "rgba(28,30,42,0.80)",
  backdropFilter:       "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border:               "1px solid rgba(100,117,209,0.25)",
  borderRadius:         16,
  padding:              "40px 44px",
  width:                "100%",
  maxWidth:             440,
}

const INPUT: React.CSSProperties = {
  width:        "100%",
  background:   "#1c1e2a",
  border:       "1px solid rgba(188,188,201,0.18)",
  borderRadius: 10,
  color:        "#fff",
  fontSize:     14,
  padding:      "11px 14px",
  outline:      "none",
}

const BTN: React.CSSProperties = {
  width:         "100%",
  background:    "#6475D1",
  color:         "#fff",
  border:        "none",
  borderRadius:  10,
  padding:       "12px 0",
  fontSize:      15,
  fontWeight:    700,
  cursor:        "pointer",
  display:       "flex",
  alignItems:    "center",
  justifyContent: "center",
  gap:           8,
  marginTop:     8,
}

export default function CRMLoginPage() {
  const router = useRouter()

  const [step,        setStep]        = useState<"creds" | "otp">("creds")
  const [email,       setEmail]       = useState("")
  const [password,    setPassword]    = useState("")
  const [otp,         setOtp]         = useState("")
  const [showPass,    setShowPass]    = useState(false)
  const [loading,     setLoading]     = useState(false)

  // Step 1 — email + password
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await axios.post(
        `${API}/api/v1/auth/login`,
        { email, password },
        { withCredentials: true },
      )
      // Admin accounts: backend returns no userID — 2FA code sent
      const requiresTwoFactor = !data?.data?.userID
      if (!requiresTwoFactor) {
        // Regular user trying to log in — reject
        toast.error("This panel is for admins only.")
        return
      }
      toast.info("Verification code sent to your email")
      setStep("otp")
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? "Login failed")
    } finally {
      setLoading(false)
    }
  }

  // Step 2 — 2FA OTP
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await axios.post(
        `${API}/api/v1/auth/admin`,
        { email, code: otp },
        { withCredentials: true },
      )
      toast.success("Welcome, admin")
      router.replace("/")
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? "Invalid or expired code")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      style={{
        minHeight:       "100vh",
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        padding:         "24px 16px",
        background:      "radial-gradient(ellipse at 60% 0%, rgba(100,117,209,0.18) 0%, transparent 60%), #1E2532",
      }}
    >
      <div style={PANEL}>
        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(100,117,209,0.18)", border: "1px solid rgba(100,117,209,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={20} color="#6475D1" />
          </div>
          <div>
            <p style={{ color: "#fff", fontSize: 17, fontWeight: 800, margin: 0, lineHeight: 1 }}>DisLow Admin</p>
            <p style={{ color: "#9fa0a1", fontSize: 11, margin: "3px 0 0", letterSpacing: "0.06em" }}>INTERNAL CRM PANEL</p>
          </div>
        </div>

        {step === "creds" ? (
          <form onSubmit={handleLogin}>
            <p style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Sign in</p>
            <p style={{ color: "#9fa0a1", fontSize: 13, marginBottom: 22 }}>Admin accounts require 2FA verification.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={INPUT}
              />
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ ...INPUT, paddingRight: 42 }}
                />
                <button type="button" onClick={() => setShowPass(v => !v)} tabIndex={-1}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9fa0a1" }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ ...BTN, opacity: loading ? 0.6 : 1 }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
              Continue
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify}>
            <p style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Verify it&apos;s you</p>
            <p style={{ color: "#9fa0a1", fontSize: 13, marginBottom: 22 }}>
              6-digit code sent to <strong style={{ color: "#fff" }}>{email}</strong>
            </p>

            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="6-digit code"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              style={{ ...INPUT, textAlign: "center", letterSpacing: "0.5em", fontSize: 20 }}
            />

            <button type="submit" disabled={loading} style={{ ...BTN, opacity: loading ? 0.6 : 1 }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
              Verify &amp; Enter
            </button>

            <button type="button" onClick={() => { setStep("creds"); setOtp("") }}
              style={{ display: "block", margin: "12px auto 0", background: "none", border: "none", color: "#9fa0a1", fontSize: 13, cursor: "pointer" }}>
              ← back
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
