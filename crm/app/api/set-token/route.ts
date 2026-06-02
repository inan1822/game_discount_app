import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/set-token
 *
 * Called by the CRM login page immediately after a successful /auth/admin OTP
 * verification.  The backend sets its own httpOnly cookie on crm-dislow.onrender.com,
 * but the CRM runs on crm-dislow-gba8.onrender.com — a different domain — so that
 * cookie is invisible to the CRM's server-side fetchers (cookies() in next/headers).
 *
 * This route handler runs server-side inside the CRM's domain, so it CAN set a
 * cookie that Next.js RSCs (admin.server.ts) will read on every subsequent request.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const token = body?.token

  if (!token || typeof token !== "string") {
    return NextResponse.json({ ok: false, error: "missing token" }, { status: 400 })
  }

  const isProd = process.env.NODE_ENV === "production"
  const res = NextResponse.json({ ok: true })

  res.cookies.set("dislow_token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",   // same-origin within the CRM — lax is fine
    maxAge: 2 * 60 * 60, // 2 h — matches JWT expiry
    path: "/",
  })

  return res
}
