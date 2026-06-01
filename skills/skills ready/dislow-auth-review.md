---
name: dislow-auth-review
description: >
  Full authentication security and page-logic review for the DisLow project — a game deal finder + key store
  with a Next.js storefront (port 3000), Express backend (port 5000), and a separate CRM admin panel (port 3001).

  Use this skill whenever the user asks to: review auth, check if routes are protected, audit login/logout flows,
  verify admin guards, check for data exposure, test JWT handling, review 2FA logic, check if the 401 interceptor
  is correct, or says anything like "is this route secure?", "check my auth", "is this protected?", "review my
  middleware", or "audit the CRM login". Also trigger on: "check httpOnly cookie", "verify admin role check",
  "is my auth guard correct", or any security/auth question in the DisLow project — even if the user only asks
  about a single page or file.
---

# DisLow Auth Review

You are performing a full authentication security and business-logic audit across the DisLow three-app stack.

## Auth Architecture (read this first — it shapes every verdict)

| Layer | Mechanism |
|---|---|
| Token storage | httpOnly cookie `dislow_token` — never accessible from JS |
| Storefront auth | `AuthContext` + axios interceptor: 401 → redirect to `/login`, **EXCEPT** `/auth/me` and `/users/me/*` (these are the "am I logged in?" checks — swallowing their 401s is intentional) |
| Admin 2FA flow | `/login` (email+password) → OTP email → `POST /auth/admin` → cookie set → CRM access |
| CRM server guard | `fetchAdminMe()` called in `(protected)/layout.tsx` — this is the **only** server-side gate for all CRM admin routes |
| Backend middleware | `authMiddleware` validates JWT; `isAdmin` checks `role === "admin"` |

**The most important distinction:** Client-side guards (`useEffect` + `router.push("/login")`) protect UX, not data. A route is only truly secure if the **server** refuses the data request for unauthenticated/unauthorized users. Always check both layers.

---

## How to Conduct the Review

For each page/route below, open the relevant files and check these five things:

### 1. Auth Guard
Is the route actually protected? Trace the execution path:
- **Storefront:** Does the page check `AuthContext.user` or call a protected API on render? Is there a server component that calls an auth-gated endpoint?
- **CRM:** Does the route live under `(protected)/`? Is `fetchAdminMe()` in its layout chain?
- **Backend endpoints it calls:** Do they use `authMiddleware`? Do admin endpoints also use `isAdmin`?

### 2. Server vs Client Protection
Client-side redirect = UX convenience only. The backend must independently reject unauthorized requests.
- If protection is **only** a `useEffect` + `router.push("/login")` → flag as ⚠️ or ❌ depending on what data is exposed.
- If a server component or API route calls a protected backend endpoint → the server guard is real.

### 3. Data Exposure
Does the page response or API props accidentally include:
- Another user's data (orders, profile, keys)?
- Raw JWT values (the cookie is httpOnly, so this would mean something went wrong)?
- Game keys or license codes that belong to an order the requesting user doesn't own?
- Admin-only fields (role, internal notes, cost price) returned to non-admin users?

### 4. Business Logic Correctness
Does the page do exactly what it claims?
- Notifications → must only show events/discounts from **the current user's favorites**, not all games
- Orders → must be scoped to the requesting user's `userId`, not all orders
- Profile edits → must verify the authenticated user owns the profile being edited
- Admin order view → can see **all** orders (this is correct for admin, verify it's not leaking to regular users)

### 5. Common Auth Bugs
Look specifically for:
- Missing `authMiddleware` on a backend route that should be protected
- Missing `isAdmin` on an admin-only backend route
- 401 interceptor swallowing errors it shouldn't (remember: only `/auth/me` and `/users/me/*` are exempt)
- `role` check done client-side only, not enforced server-side
- OTP not hashed before storage (P0 if found)
- OTP not expiring / not invalidated after use

---

## Pages to Review

### Storefront (`client/`, port 3000)

| Route | Expected protection | Key check |
|---|---|---|
| `/` Home | Public, but "For You" tab requires auth | "For You" data fetch must 401-gracefully if not logged in; don't expose it to guests |
| `/notifications` | Auth required | Data must be scoped to `user.favorites` only — not all games in DB |
| `/favourites` | Auth required | Must only show the requesting user's saved games |
| `/search` | Public | No auth needed; verify it doesn't accidentally expose user-specific data |
| `/account/orders` | Auth required | CRITICAL: Must filter by `userId === currentUser.id` — never return all orders |
| `/friends` | Auth required | Social graph; verify follower/following queries are scoped correctly |
| `/chat` | Auth required | Real-time; verify socket connection requires valid auth token |
| `/profile` and `/profile/edit`, `/profile/password`, `/profile/linked`, `/profile/delete` | Auth required | User can only edit their **own** profile — check that the backend validates `userId` matches authenticated user |

### CRM Admin (`crm/`, port 3001)

| Route | Expected protection | Key check |
|---|---|---|
| `/login` | Public | 2FA entry point; OTP must be hashed + time-limited |
| `/` Dashboard | Admin only | Confirm under `(protected)/` with `fetchAdminMe()` |
| `/orders`, `/orders/[id]` | Admin only | Admin CAN see all orders — verify non-admins can't reach this |
| `/products`, `/products/new`, `/products/[id]`, `/products/[id]/edit`, `/products/[id]/keys` | Admin only | `/keys` is especially sensitive — game keys must never leak to non-admins |
| `/users`, `/users/[id]` | Admin only | Check that the users list doesn't expose password hashes or tokens |
| `/game-links` | Admin only | Standard admin guard check |
| `/analytics`, `/marketing` | Admin only | Standard admin guard check |

---

## Output Format

For each page/route, write:

```
[route] — [verdict] — [finding or "no issues found"]
```

Verdict icons:
- ✅ Secure — auth guard in place, data scoped correctly, no exposure
- ⚠️ Issue — partial protection or logic bug (not an immediate breach, but needs fixing)
- ❌ Vulnerable — missing guard, data leaks to unauthorized users, exploitable now

After all verdicts, write a **Prioritized Fix List**:

```
## Fix List

### P0 — Security holes (fix immediately, these are breachable now)
- ...

### P1 — Logic bugs (wrong behavior, not yet exploitable but will cause real problems)
- ...

### P2 — UX / hardening (improves security posture or user experience)
- ...
```

If there are no P0 or P1 issues, say so explicitly. Don't pad the list.

---

## Tips for Reading This Codebase

- The CRM's `(protected)/layout.tsx` is the master gate — if a route isn't under that layout, it's unprotected regardless of what the page component does.
- The axios interceptor exemption list (`/auth/me`, `/users/me/*`) is intentional — swallowing 401s there prevents infinite redirect loops. But if you see other routes exempted, flag it.
- `authMiddleware` injects `req.user` — any backend route that reads `req.user` without first running `authMiddleware` will silently get `undefined` rather than throwing.
- For the admin 2FA flow, the OTP should be stored hashed (bcrypt) and have a TTL. If it's stored plaintext or without expiry, that's a P0.
- Game keys (`/products/[id]/keys`) are the highest-value data asset in the store — always double-check this endpoint's guards.
