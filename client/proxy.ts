import { NextRequest, NextResponse } from "next/server"

// ── Route buckets ─────────────────────────────────────────────────────────────

/** Requires a valid session cookie — guests are redirected to /login */
const PROTECTED = ["/wishlist", "/profile", "/settings"]

/** Only for logged-out users — authenticated users are redirected to home */
const AUTH_ONLY = ["/login", "/register", "/forgot-password"]

// ── Proxy (replaces middleware.ts — renamed in Next.js 16) ────────────────────

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // The httpOnly cookie name must match what auth.controller.ts sets
  const hasSession = !!req.cookies.get("dislow_token")?.value

  // 1. Logged-out user tries to access a protected page → send to login
  if (!hasSession && PROTECTED.some(p => pathname.startsWith(p))) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = "/login"
    // Preserve where they were going so we can redirect back after login
    loginUrl.searchParams.set("from", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 2. Logged-in user tries to visit login/register → send home
  if (hasSession && AUTH_ONLY.some(p => pathname.startsWith(p))) {
    const homeUrl = req.nextUrl.clone()
    homeUrl.pathname = "/"
    homeUrl.search = ""
    return NextResponse.redirect(homeUrl)
  }

  return NextResponse.next()
}

// Only run on real app routes — skip Next.js internals, static files, and API
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|images|api).*)"],
}
