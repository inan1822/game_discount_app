import { Suspense } from "react"
import AuthCallbackInner from "./AuthCallbackInner"

/**
 * OAuth callback landing page.
 * useSearchParams() is in AuthCallbackInner — wrapped in Suspense here
 * as required by Next.js App Router for static page pre-rendering.
 */
export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-[#1E2532]">
          <div className="flex flex-col items-center gap-4">
            <svg
              className="animate-spin"
              width="40" height="40" viewBox="0 0 40 40" fill="none"
            >
              <circle cx="20" cy="20" r="16" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
              <path
                d="M36 20a16 16 0 0 0-16-16"
                stroke="#AE3BD6" strokeWidth="4" strokeLinecap="round"
              />
            </svg>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
              Signing you in…
            </p>
          </div>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  )
}
