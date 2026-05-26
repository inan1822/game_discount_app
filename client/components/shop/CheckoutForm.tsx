"use client"
import { useState } from "react"
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js"
import { ShieldCheck } from "lucide-react"

interface Props {
  orderId: string
  onSuccess: () => void
}

export function CheckoutForm({ orderId, onSuccess }: Props) {
  const stripe   = useStripe()
  const elements = useElements()
  const [error,     setError]     = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError(null)

    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message ?? "Something went wrong")
      setLoading(false)
      return
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?orderId=${orderId}`,
      },
      redirect: "if_required",
    })

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed")
      setLoading(false)
      return
    }

    // Payment succeeded without redirect
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div style={{
        background: "#1c1e2a",
        border: "1px solid rgba(188,188,201,0.15)",
        borderRadius: 10,
        padding: "20px",
      }}>
        <PaymentElement options={{ layout: "tabs" }} />
      </div>

      {error && (
        <p style={{
          color: "#ef4444", fontSize: 13,
          background: "rgba(239,68,68,0.10)",
          border: "1px solid rgba(239,68,68,0.25)",
          borderRadius: 10, padding: "10px 14px",
        }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        style={{
          width: "100%",
          background: loading || !stripe ? "rgba(100,117,209,0.40)" : "#6475D1",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          padding: "14px 0",
          fontSize: 15,
          fontWeight: 700,
          cursor: loading || !stripe ? "not-allowed" : "pointer",
          transition: "background 0.2s",
        }}
      >
        {loading ? "Processing…" : "Pay Now"}
      </button>

      <div className="flex items-center justify-center gap-2" style={{ color: "#9fa0a1", fontSize: 12 }}>
        <ShieldCheck className="w-3.5 h-3.5" />
        Secured by Stripe — your card details are never stored
      </div>
    </form>
  )
}
