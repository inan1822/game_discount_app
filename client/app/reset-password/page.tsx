import { Suspense } from "react"
import ResetPasswordInner from "./ResetPasswordInner"
import { AuthPageShell } from "@/components/auth/AuthPageShell"

/**
 * useSearchParams() is in ResetPasswordInner — wrapped in Suspense here
 * as required by Next.js App Router for static page pre-rendering.
 */
export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthPageShell>
          <div className="flex flex-col items-center gap-4">
            <svg className="animate-spin" width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="16" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
              <path d="M36 20a16 16 0 0 0-16-16" stroke="#AE3BD6" strokeWidth="4" strokeLinecap="round" />
            </svg>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Loading…</p>
          </div>
        </AuthPageShell>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  )
}
