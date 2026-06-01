"use client"
import { useEffect, useState, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import PageBackground from "@/components/ui/PageBackground"
import { CheckCircle, Mail, ShoppingBag, Key, Copy, Check, Loader2 } from "lucide-react"
import Link from "next/link"
import { fetchOrderKey } from "@/lib/api/support"

const PANEL: React.CSSProperties = {
  background: "rgba(28,30,42,0.70)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border: "1px solid rgba(188,188,201,0.15)",
  borderRadius: 10,
}

const POLL_INTERVAL_MS = 2000
const MAX_ATTEMPTS     = 15  // ≈ 30 seconds total

function CheckoutSuccessInner() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId") || ""

  const [key,     setKey]     = useState<string | null>(null)
  const [polling, setPolling] = useState<boolean>(!!orderId)
  const [copied,  setCopied]  = useState(false)
  const attemptsRef = useRef(0)

  // Poll for the key — the Stripe webhook flips the order to "delivered"
  // asynchronously, so the key may not be ready the instant Stripe redirects.
  useEffect(() => {
    if (!orderId) { setPolling(false); return }

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    async function poll() {
      if (cancelled) return
      attemptsRef.current += 1
      const code = await fetchOrderKey(orderId)
      if (cancelled) return
      if (code) {
        setKey(code)
        setPolling(false)
        return
      }
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setPolling(false) // fall back to "check your email" UI
        return
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS)
    }

    poll()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [orderId])

  async function copyKey() {
    if (!key) return
    await navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "#1E2532", color: "#fff" }}>
      <PageBackground />
      <div className="relative flex flex-col items-center justify-center min-h-screen px-4" style={{ zIndex: 3 }}>
        <div style={{ ...PANEL, maxWidth: 440, width: "100%", padding: "40px 32px", textAlign: "center" }}>
          {/* Icon */}
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "rgba(68,214,44,0.15)", border: "2px solid rgba(68,214,44,0.40)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px",
          }}>
            <CheckCircle className="w-9 h-9" style={{ color: "#44d62c" }} />
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
            Payment Successful!
          </h1>

          {/* Key reveal — while polling, show spinner; once ready, show code inline */}
          {key ? (
            <>
              <p style={{ color: "#b3bade", fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                Your key is ready. A copy was also sent to your email.
              </p>
              <div style={{
                background: "rgba(68,214,44,0.06)",
                border: "1px solid rgba(68,214,44,0.30)",
                borderRadius: 10, padding: "16px 18px", marginBottom: 24,
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, marginBottom: 8,
                }}>
                  <Key className="w-4 h-4" style={{ color: "#44d62c" }} />
                  <p style={{ color: "#9fa0a1", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}>
                    YOUR KEY
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <code style={{
                    color: "#44d62c", fontSize: 15, fontWeight: 700,
                    letterSpacing: "0.05em", flex: 1, textAlign: "left",
                    wordBreak: "break-all",
                  }}>
                    {key}
                  </code>
                  <button
                    onClick={copyKey}
                    style={{
                      background: copied ? "rgba(68,214,44,0.20)" : "rgba(188,188,201,0.10)",
                      border: "none", borderRadius: 6, cursor: "pointer",
                      color: copied ? "#44d62c" : "#b3bade",
                      padding: "5px 10px", fontSize: 11, fontWeight: 600,
                      display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
                    }}
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            </>
          ) : polling ? (
            <>
              <p style={{ color: "#b3bade", fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                Confirming your payment and preparing your key…
              </p>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                background: "rgba(100,117,209,0.10)",
                border: "1px solid rgba(100,117,209,0.20)",
                borderRadius: 10, padding: "16px 18px", marginBottom: 24,
              }}>
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#6475D1" }} />
                <p style={{ color: "#b3bade", fontSize: 13 }}>Waiting for confirmation…</p>
              </div>
            </>
          ) : (
            <>
              <p style={{ color: "#b3bade", fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                Your key is on the way. Check your email — or view it in your account.
              </p>
              <div className="flex items-center gap-3" style={{
                background: "rgba(68,214,44,0.08)", borderRadius: 10, padding: "12px 16px",
                marginBottom: 24,
              }}>
                <Mail className="w-4 h-4 flex-shrink-0" style={{ color: "#44d62c" }} />
                <p style={{ color: "#b3bade", fontSize: 13, textAlign: "left" }}>
                  Sent to your registered email
                </p>
              </div>
            </>
          )}

          {orderId && (
            <div style={{
              background: "rgba(100,117,209,0.10)",
              border: "1px solid rgba(100,117,209,0.20)",
              borderRadius: 10, padding: "10px 14px", marginBottom: 24,
            }}>
              <p style={{ color: "#9fa0a1", fontSize: 11, marginBottom: 2 }}>Order ID</p>
              <p style={{ color: "#fff", fontSize: 12, fontFamily: "monospace" }}>
                #{orderId.slice(-12).toUpperCase()}
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-2">
            <Link href="/" style={{
              flex: 1, display: "block", textAlign: "center",
              background: "rgba(100,117,209,0.20)", color: "#6475D1",
              border: "1px solid rgba(100,117,209,0.30)", borderRadius: 10,
              padding: "11px 0", fontSize: 14, fontWeight: 600, textDecoration: "none",
            }}>
              <ShoppingBag className="w-4 h-4 inline mr-1" />
              Browse
            </Link>
            <Link href="/account/orders" style={{
              flex: 1, display: "block", textAlign: "center",
              background: "#6475D1", color: "#fff",
              borderRadius: 10, padding: "11px 0",
              fontSize: 14, fontWeight: 600, textDecoration: "none",
            }}>
              My Orders
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// useSearchParams() must be inside a Suspense boundary for static prerender.
export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="relative min-h-screen" style={{ background: "#1E2532" }} />
    }>
      <CheckoutSuccessInner />
    </Suspense>
  )
}
