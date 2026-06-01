import { NextRequest, NextResponse } from "next/server"

// Every route that requires a logged-in user.
// A missing entry here causes a page flash before the client-side guard fires.
const PROTECTED = [
  "/favourites",
  "/profile",
  "/notifications",
  "/friends",
  "/account",
  "/chat",
  "/settings",
]
const AUTH_ONLY = ["/login", "/register", "/forgot-password"]

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const hasSession = !!req.cookies.get("dislow_token")?.value

  if (!hasSession && PROTECTED.some(p => pathname.startsWith(p))) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("from", pathname)
    return NextResponse.redirect(url)
  }

  if (hasSession && AUTH_ONLY.some(p => pathname.startsWith(p))) {
    const url = req.nextUrl.clone()
    url.pathname = "/"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|images|api).*)"],
}
