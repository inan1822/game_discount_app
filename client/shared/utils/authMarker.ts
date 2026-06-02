/**
 * Auth marker cookie — bridges localStorage auth to the server-side proxy/middleware.
 *
 * Why this exists:
 *   In the cross-domain Render setup the real JWT lives in localStorage and is
 *   sent to the API as a Bearer header. The frontend's own middleware (proxy.ts)
 *   runs server-side and CANNOT read localStorage — it can only read cookies on
 *   the frontend domain. So we drop a lightweight, non-sensitive marker cookie
 *   ("dislow_auth=1") on the frontend domain to tell the middleware a session
 *   exists. The marker holds NO token — it's just a boolean presence flag. All
 *   real authorization is still enforced by the backend on every Bearer request.
 */

const MARKER = "dislow_auth"
const MAX_AGE = 2 * 60 * 60 // 2h — matches JWT expiry

export function setAuthMarker(): void {
  if (typeof document === "undefined") return
  const secure = location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${MARKER}=1; path=/; max-age=${MAX_AGE}; SameSite=Lax${secure}`
}

export function clearAuthMarker(): void {
  if (typeof document === "undefined") return
  const secure = location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${MARKER}=; path=/; max-age=0; SameSite=Lax${secure}`
}
