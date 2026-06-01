"use client"
import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import { Elements } from "@stripe/react-stripe-js"
import { CheckoutForm } from "@/components/shop/CheckoutForm"
import { createCheckout, fetchStoreProduct, validatePromo } from "@/shared/services/shop"
import PageBackground from "@/shared/components/PageBackground"
import type { Product, PromoValidation } from "@/shared/types/admin"
import { ArrowLeft, ShoppingBag, Tag, X, Check, Key, Copy, PartyPopper } from "lucide-react"
import { useAuth } from "@/features/auth/state/AuthContext"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

const PANEL: React.CSSProperties = {
  background: "rgba(28,30,42,0.70)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border: "1px solid rgba(188,188,201,0.15)",
  borderRadius: 10,
}

function CheckoutInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const productId = searchParams.get("productId") || ""

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?from=/checkout?productId=${productId}`)
    }
  }, [user, authLoading, productId, router])

  const [product,      setProduct]      = useState<Product | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [orderId,      setOrderId]      = useState<string>("")
  const [error,        setError]        = useState<string | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [isFree,       setIsFree]       = useState(false)
  const [freeKey,      setFreeKey]      = useState<string | null>(null)
  const [keyCopied,    setKeyCopied]    = useState(false)

  // ── Promo code state ─────────────────────────────────────────────────────
  const [promoInput,    setPromoInput]    = useState("")
  const [promoChecking, setPromoChecking] = useState(false)
  const [promoResult,   setPromoResult]   = useState<PromoValidation | null>(null)
  const [promoError,    setPromoError]    = useState<string | null>(null)

  useEffect(() => {
    if (!productId) { router.push("/shop"); return }
    if (authLoading || !user) return   // wait for auth before fetching

    async function init() {
      try {
        const prod = await fetchStoreProduct(productId)
        setProduct(prod)
        // Don't create checkout yet — wait until user is ready (or promo applied)
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { message?: string } } }
        setError(axiosErr?.response?.data?.message ?? "Failed to load product")
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [productId, router, user, authLoading])

  async function startCheckout(promoCode?: string) {
    if (!productId) return
    setLoading(true)
    setError(null)
    try {
      const checkout = await createCheckout(productId, promoCode)
      setOrderId(checkout.orderId)
      if (checkout.isFree) {
        setIsFree(true)
        setFreeKey(checkout.gameKey ?? null)
      } else {
        setClientSecret(checkout.clientSecret)
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      setError(axiosErr?.response?.data?.message ?? "Failed to start checkout")
    } finally {
      setLoading(false)
    }
  }

  async function copyKey() {
    if (!freeKey) return
    await navigator.clipboard.writeText(freeKey)
    setKeyCopied(true)
    setTimeout(() => setKeyCopied(false), 2000)
  }

  async function handleApplyPromo() {
    if (!promoInput.trim() || !productId) return
    setPromoChecking(true)
    setPromoError(null)
    setPromoResult(null)
    try {
      const result = await validatePromo(promoInput.trim(), productId)
      setPromoResult(result)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      setPromoError(axiosErr?.response?.data?.message ?? "Invalid promo code")
    } finally {
      setPromoChecking(false)
    }
  }

  function handleClearPromo() {
    setPromoInput("")
    setPromoResult(null)
    setPromoError(null)
  }

  function handleSuccess() {
    router.push(`/checkout/success?orderId=${orderId}`)
  }

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "#1E2532", color: "#fff" }}>
      <PageBackground />
      <div className="relative max-w-2xl mx-auto px-4 py-10" style={{ zIndex: 3 }}>
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-8"
          style={{
            background: "rgba(28,30,42,0.60)", backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)", border: "1px solid rgba(188,188,201,0.15)",
            borderRadius: 10, color: "#b3bade", fontSize: 13,
            padding: "6px 14px", cursor: "pointer",
          }}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 24 }}>Checkout</h1>

        {loading && (
          <div style={PANEL} className="p-8 text-center">
            <p style={{ color: "#9fa0a1" }}>Preparing your order…</p>
          </div>
        )}

        {error && (
          <div style={{
            ...PANEL, padding: "20px 24px",
            border: "1px solid rgba(239,68,68,0.30)",
            background: "rgba(239,68,68,0.08)",
          }}>
            <p style={{ color: "#ef4444", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Checkout unavailable</p>
            <p style={{ color: "#b3bade", fontSize: 13 }}>{error}</p>
            <button
              onClick={() => router.push("/shop")}
              style={{
                marginTop: 16, background: "rgba(100,117,209,0.20)", color: "#6475D1",
                border: "1px solid rgba(100,117,209,0.30)", borderRadius: 10,
                padding: "7px 16px", fontSize: 13, cursor: "pointer",
              }}
            >
              Back to Shop
            </button>
          </div>
        )}

        {/* Product loaded — show summary + promo before payment begins */}
        {!loading && !error && product && !clientSecret && (
          <div className="space-y-6">
            {/* Order summary */}
            <div style={PANEL} className="p-5">
              <p style={{ fontSize: 12, color: "#9fa0a1", marginBottom: 12, fontWeight: 600 }}>ORDER SUMMARY</p>
              <div className="flex items-center gap-4">
                {product.imageUrl && (
                  <img src={product.imageUrl} alt="" style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 8 }} />
                )}
                <div className="flex-1">
                  <p style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{product.name}</p>
                  <p style={{ color: "#9fa0a1", fontSize: 12 }}>{product.platform} · {product.category}</p>
                </div>
                <p style={{ color: promoResult ? "#9fa0a1" : "#44d62c", fontSize: 20, fontWeight: 800,
                  textDecoration: promoResult ? "line-through" : "none" }}>
                  {currency.format(product.price)}
                </p>
              </div>

              {/* Promo code input */}
              <div style={{ borderTop: "1px solid rgba(188,188,201,0.10)", marginTop: 16, paddingTop: 14 }}>
                {!promoResult ? (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#9fa0a1" }} />
                      <input
                        value={promoInput}
                        onChange={e => setPromoInput(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === "Enter" && handleApplyPromo()}
                        placeholder="Promo code"
                        style={{
                          width: "100%", background: "#1c1e2a",
                          border: "1px solid rgba(188,188,201,0.15)",
                          borderRadius: 10, color: "#fff", fontSize: 13,
                          padding: "8px 12px 8px 32px", outline: "none",
                        }}
                      />
                    </div>
                    <button
                      onClick={handleApplyPromo}
                      disabled={promoChecking || !promoInput.trim()}
                      style={{
                        background: "rgba(100,117,209,0.15)", color: "#6475D1",
                        border: "1px solid rgba(100,117,209,0.25)",
                        borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 600,
                        cursor: promoChecking || !promoInput.trim() ? "not-allowed" : "pointer",
                        opacity: promoChecking || !promoInput.trim() ? 0.5 : 1,
                      }}
                    >
                      {promoChecking ? "…" : "Apply"}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between"
                    style={{
                      background: "rgba(68,214,44,0.08)",
                      border: "1px solid rgba(68,214,44,0.20)",
                      borderRadius: 10, padding: "8px 14px",
                    }}>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4" style={{ color: "#44d62c" }} />
                      <span style={{ color: "#44d62c", fontSize: 13, fontWeight: 700 }}>
                        {promoResult.code}
                      </span>
                      <span style={{ color: "#9fa0a1", fontSize: 12 }}>
                        — {promoResult.type === "percent"
                          ? `${promoResult.value}% off`
                          : `${currency.format(promoResult.value)} off`}
                      </span>
                    </div>
                    <button onClick={handleClearPromo}
                      style={{ background: "none", border: "none", color: "#9fa0a1", cursor: "pointer", padding: 4 }}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {promoError && (
                  <p style={{ color: "#ef4444", fontSize: 12, marginTop: 6 }}>{promoError}</p>
                )}
              </div>

              {/* Price breakdown */}
              <div style={{ borderTop: "1px solid rgba(188,188,201,0.10)", marginTop: 14, paddingTop: 12 }} className="space-y-2">
                {promoResult && (
                  <>
                    <div className="flex justify-between items-center">
                      <span style={{ color: "#9fa0a1", fontSize: 13 }}>Subtotal</span>
                      <span style={{ color: "#9fa0a1", fontSize: 13 }}>{currency.format(promoResult.originalPrice)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span style={{ color: "#44d62c", fontSize: 13 }}>Discount</span>
                      <span style={{ color: "#44d62c", fontSize: 13 }}>−{currency.format(promoResult.discount)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center">
                  <span style={{ color: "#9fa0a1", fontSize: 13 }}>Total</span>
                  <span style={{ color: "#fff", fontSize: 20, fontWeight: 800 }}>
                    {currency.format(promoResult ? promoResult.finalAmount : product.price)}
                  </span>
                </div>
              </div>
            </div>

            {/* Proceed button */}
            {(() => {
              const isFreeProduct = (promoResult ? promoResult.finalAmount : product.price) === 0
              return (
                <button
                  onClick={() => startCheckout(promoResult?.code ?? undefined)}
                  style={{
                    width: "100%", background: "#6475D1", color: "#fff",
                    border: "none", borderRadius: 10, padding: "14px 0",
                    fontSize: 15, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#5264c7" }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#6475D1" }}
                >
                  {isFreeProduct
                    ? <><Key className="w-5 h-5" /> Claim for Free</>
                    : <><ShoppingBag className="w-5 h-5" /> Proceed to Payment</>}
                </button>
              )
            })()}
          </div>
        )}

        {/* Free product — instant delivery screen */}
        {!loading && !error && isFree && product && (
          <div className="space-y-6">
            <div style={{ ...PANEL, padding: "32px 24px", textAlign: "center" }}>
              <div className="flex items-center justify-center mb-4"
                style={{ width: 64, height: 64, borderRadius: "50%",
                  background: "rgba(68,214,44,0.12)", border: "1px solid rgba(68,214,44,0.25)",
                  margin: "0 auto 16px" }}>
                <PartyPopper className="w-7 h-7" style={{ color: "#44d62c" }} />
              </div>
              <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
                It&apos;s yours — for free!
              </h2>
              <p style={{ color: "#9fa0a1", fontSize: 13, marginBottom: 24 }}>
                {product.name} · {product.platform}
              </p>

              {freeKey ? (
                <>
                  <p style={{ color: "#9fa0a1", fontSize: 12, marginBottom: 8, fontWeight: 600 }}>YOUR KEY</p>
                  <div className="flex items-center gap-3 justify-center"
                    style={{
                      background: "#1c1e2a", border: "1px solid rgba(68,214,44,0.25)",
                      borderRadius: 10, padding: "12px 20px", marginBottom: 16,
                    }}>
                    <Key className="w-4 h-4 flex-shrink-0" style={{ color: "#44d62c" }} />
                    <code style={{ color: "#44d62c", fontSize: 16, fontWeight: 700, letterSpacing: "0.08em", flex: 1, textAlign: "center" }}>
                      {freeKey}
                    </code>
                    <button onClick={copyKey} style={{
                      background: keyCopied ? "rgba(68,214,44,0.15)" : "rgba(188,188,201,0.08)",
                      border: "none", borderRadius: 8, cursor: "pointer",
                      color: keyCopied ? "#44d62c" : "#9fa0a1",
                      padding: "6px 10px", fontSize: 11, fontWeight: 600,
                      display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
                    }}>
                      <Copy className="w-3.5 h-3.5" />
                      {keyCopied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <div style={{
                    display: "flex", flexDirection: "column", gap: 6, alignItems: "center", marginTop: 4,
                  }}>
                    <p style={{ color: "#9fa0a1", fontSize: 11 }}>
                      📧 Receipt sent to <strong style={{ color: "#b3bade" }}>{user?.email}</strong>
                    </p>
                    <p style={{ color: "#9fa0a1", fontSize: 11 }}>
                      Also saved to your{" "}
                      <span
                        onClick={() => router.push("/account/orders")}
                        style={{ color: "#6475D1", cursor: "pointer", textDecoration: "underline" }}
                      >
                        order history
                      </span>
                    </p>
                  </div>
                </>
              ) : (
                <p style={{ color: "#9fa0a1", fontSize: 13 }}>
                  Your key will be delivered to <strong style={{ color: "#fff" }}>{user?.email}</strong>
                </p>
              )}
            </div>

            <button
              onClick={() => router.push("/")}
              style={{
                width: "100%", background: "#6475D1", color: "#fff",
                border: "none", borderRadius: 10, padding: "14px 0",
                fontSize: 15, fontWeight: 700, cursor: "pointer",
              }}
            >
              Back to Home
            </button>
          </div>
        )}

        {/* Payment form — shown after checkout session is created */}
        {!loading && !error && product && clientSecret && (
          <div className="space-y-6">
            {/* Summary bar */}
            <div style={{ ...PANEL, padding: "14px 20px" }} className="flex items-center justify-between">
              <div>
                <p style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{product.name}</p>
                <p style={{ color: "#9fa0a1", fontSize: 11 }}>{product.platform} · {product.category}</p>
              </div>
              <p style={{ color: "#44d62c", fontSize: 20, fontWeight: 800 }}>
                {currency.format(promoResult ? promoResult.finalAmount : product.price)}
              </p>
            </div>

            {/* Stripe Payment */}
            <div style={PANEL} className="p-5">
              <p style={{ fontSize: 12, color: "#9fa0a1", marginBottom: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <ShoppingBag className="w-3.5 h-3.5" /> PAYMENT DETAILS
              </p>
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "night",
                    variables: {
                      colorPrimary: "#6475D1",
                      colorBackground: "#1c1e2a",
                      colorText: "#ffffff",
                      fontFamily: "Nunito, sans-serif",
                    },
                  },
                }}
              >
                <CheckoutForm orderId={orderId} onSuccess={handleSuccess} />
              </Elements>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// useSearchParams() must be inside a Suspense boundary for static prerender.
export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="relative min-h-screen" style={{ background: "#1E2532" }} />
    }>
      <CheckoutInner />
    </Suspense>
  )
}
