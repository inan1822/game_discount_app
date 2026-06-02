"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "react-toastify"
import axios from "axios"
import { Eye, EyeOff } from "lucide-react"
import dynamic from "next/dynamic"
import { SparkleButton } from "@/components/ui/SparkleButton"
import type { GalleryItem } from "@/components/ui/CircularGallery"

const PageBackground = dynamic(() => import("@/components/ui/PageBackground"), { ssr: false })
const CircularGallery = dynamic(
  () => import("@/components/ui/CircularGallery").then(m => ({ default: m.CircularGallery })),
  { ssr: false },
)

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

// Same game covers as storefront login
const COVERS = [
  "https://cdn.akamai.steamstatic.com/steam/apps/1245620/library_600x900.jpg",
  "https://cdn.akamai.steamstatic.com/steam/apps/1174180/library_600x900.jpg",
  "https://cdn.akamai.steamstatic.com/steam/apps/1091500/library_600x900.jpg",
  "https://cdn.akamai.steamstatic.com/steam/apps/1145360/library_600x900.jpg",
  "https://cdn.akamai.steamstatic.com/steam/apps/814380/library_600x900.jpg",
  "https://cdn.akamai.steamstatic.com/steam/apps/1190460/library_600x900.jpg",
  "https://cdn.akamai.steamstatic.com/steam/apps/870780/library_600x900.jpg",
  "https://cdn.akamai.steamstatic.com/steam/apps/632470/library_600x900.jpg",
  "https://cdn.akamai.steamstatic.com/steam/apps/1326470/library_600x900.jpg",
  "https://cdn.akamai.steamstatic.com/steam/apps/1551360/library_600x900.jpg",
  "https://cdn.akamai.steamstatic.com/steam/apps/1938090/library_600x900.jpg",
  "https://cdn.akamai.steamstatic.com/steam/apps/2358720/library_600x900.jpg",
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut", delay },
})

// ─── Inner login form (needs useSearchParams → must be inside Suspense) ────────
function CRMLoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // If redirected from storefront after credentials step, pre-fill email + jump to OTP
  const paramEmail = searchParams.get("email") ?? ""
  const paramStep  = searchParams.get("step")  ?? "creds"

  const [step,         setStep]         = useState<"creds" | "otp">(paramStep === "otp" ? "otp" : "creds")
  const [email,        setEmail]        = useState(paramEmail)
  const [password,     setPassword]     = useState("")
  const [otp,          setOtp]          = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)

  // Gallery — shuffle after mount to avoid SSR mismatch
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(
    COVERS.map(url => ({ common: "", binomial: "", photo: { url, text: "", by: "", pos: "center" } }))
  )
  useEffect(() => {
    setGalleryItems(
      shuffle(COVERS).map(url => ({ common: "", binomial: "", photo: { url, text: "", by: "", pos: "center" } }))
    )
  }, [])

  // Step 1 — credentials
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await axios.post(`${API}/api/v1/auth/login`, { email, password }, { withCredentials: true })
      const requiresTwoFactor = !data?.data?.userID
      if (!requiresTwoFactor) {
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
      const { data } = await axios.post(`${API}/api/v1/auth/admin`, { email, code: otp }, { withCredentials: true })
      const token = data?.data?.token
      if (!token) throw new Error("No token returned from server")

      // The backend sets its cookie on crm-dislow.onrender.com (backend domain).
      // The CRM's RSC runs on crm-dislow-gba8.onrender.com and can't read a cookie
      // from another domain.  POST the token to our own route handler so it gets
      // stored as an httpOnly cookie on THIS domain — admin.server.ts can then
      // read it via cookies() on every server-side fetch.
      await fetch("/api/set-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })

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
      className="relative flex flex-col h-screen w-screen overflow-hidden"
      style={{ background: "#1E2532" }}
    >
      <PageBackground />

      {/* Login card — same layout as storefront */}
      <div
        className="relative flex-1 flex items-center justify-center px-4"
        style={{ zIndex: 3, paddingBottom: 80 }}
      >
        <div className="w-full" style={{ maxWidth: 467 }}>

          {/* Logo + wordmark */}
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center gap-4">
              <img src="/icons/logo.svg"      alt=""        style={{ width: 54, height: 54 }} />
              <img src="/icons/logo-text.svg" alt="DisLow"  style={{ height: 52, width: "auto" }} />
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.40)", marginTop: 8 }}>
              Admin Panel — internal access only
            </p>
          </div>

          {/* Glass card */}
          <div style={{
            background:           "rgba(43, 48, 89, 0.70)",
            backdropFilter:       "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            borderRadius:         10,
            padding:              "40px 44px",
          }}>
            {/* Title */}
            <div className="mb-6">
              <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
                {step === "creds" ? "Admin sign in" : "Verify it's you"}
              </h1>
              <p style={{ fontSize: 13, color: "#9fa0a1" }}>
                {step === "creds"
                  ? "Sign in to the DisLow admin panel"
                  : <span>We sent a 6-digit code to <span style={{ color: "#fff" }}>{email}</span></span>}
              </p>
            </div>

            {step === "creds" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <input
                  type="email"
                  placeholder="Admin email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="auth-input"
                />
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="auth-input pr-12"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9fa0a1] hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="pt-1">
                  <SparkleButton label="Sign in to Admin" type="submit" loading={loading} />
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerify} className="space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="6-digit code"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  autoFocus
                  className="auth-input"
                  style={{ textAlign: "center", letterSpacing: "0.4em", fontSize: 18 }}
                />

                <div className="pt-1">
                  <SparkleButton label="Verify &amp; Enter" type="submit" loading={loading} />
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setStep("creds"); setOtp("") }}
                    className="text-xs transition-colors hover:text-white"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                  >
                    ← back to login
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Circular game gallery — same as storefront */}
      <div
        className="relative flex-shrink-0 w-full"
        style={{ height: 260, zIndex: 1 }}
      >
        <CircularGallery
          items={galleryItems}
          radius={620}
          autoRotateSpeed={0.012}
          showOverlay={false}
        />
      </div>

      <div className="flex-shrink-0" style={{ height: 120 }} />
    </main>
  )
}

// Suspense wrapper required for useSearchParams in Next.js App Router
export default function CRMLoginPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen" style={{ background: "#1E2532" }} />
    }>
      <CRMLoginInner />
    </Suspense>
  )
}
