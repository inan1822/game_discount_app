---
name: dislow-code-review
description: >
  Senior full-stack code review for DisLow — a mobile-first game deal finder app.
  Use this skill whenever the user asks for a code review, audit, bug check, or
  security analysis of the DisLow project or any part of its stack. Triggers on:
  reviewing backend routes, auth flow, price caching, RAWG/CheapShark/ITAD
  integration, JWT handling, Socket.io, Next.js App Router pages, search ranking,
  TypeScript types, or any code in this project. Always use this skill when the
  user says "review", "audit", "check for bugs", "find issues", or "is this safe"
  in the context of DisLow — even if they only mention a single file or feature.
---

# DisLow Code Review Skill

Perform senior-engineer level code reviews of the DisLow game deal finder app.
Cover correctness, security, performance, architecture, TypeScript, error
handling, naming, and dead code. Produce a prioritized fix list at the end.

## Stack Reference

**Backend** (`/server`): Node.js · Express 5 · TypeScript · MongoDB/Mongoose ·
JWT (access 15m + refresh 7d in httpOnly cookies) · bcrypt · Joi · nodemailer ·
helmet · hpp · express-rate-limit · multer · cloudinary · morgan · socket.io ·
fuse.js · axios

**Frontend** (`/client`): Next.js 16 App Router · React 19 · TypeScript ·
Tailwind 4 · shadcn/ui · @base-ui/react · framer-motion · next-auth v5-beta ·
axios (with interceptors) · react-toastify · fuse.js · use-debounce · lucide-react

---

## Review Dimensions

For every file or area reviewed, address all eight dimensions:

1. **CORRECTNESS** — logic bugs, edge cases, race conditions, off-by-one errors
2. **SECURITY** — injection, auth bypass, missing validation, token leaks, CORS
3. **PERFORMANCE** — N+1 queries, missing indexes, unnecessary re-renders, cache misses
4. **ARCHITECTURE** — separation of concerns, single responsibility, coupling
5. **TYPESCRIPT** — loose types (`any`), missing generics, unsafe casts
6. **ERROR HANDLING** — unhandled promises, missing try/catch, silent failures
7. **NAMING** — unclear variables, misleading function names
8. **DEAD CODE** — unused imports, unreachable branches, stale comments

---

## System Architecture

```
/
├── client/                     # Next.js 16 App Router
│   ├── app/
│   │   ├── page.tsx            # Home — 6 sections loaded in parallel
│   │   ├── games/[slug]/page.tsx   # GameDetail — RAWG + CheapShark + ITAD
│   │   ├── search/page.tsx     # RAWG search → Fuse.js re-ranking
│   │   └── auth/callback/page.tsx  # Google OAuth callback (Suspense-wrapped)
│   └── .env.local
└── server/                     # Express 5 + TypeScript
    ├── src/
    │   ├── server.ts           # Entry: env validation, middleware, routes
    │   ├── auth/               # JWT, bcrypt, nodemailer, OAuth
    │   └── games/              # priceService, RAWG, CheapShark, ITAD
    └── .env
```

### Home page data flow

```
HomePageLoad
  └─ parallel fetch (6 sections): Popular / New / Trending / For You /
                                   Hidden Gems / Deal of the Day
       └─ each section: RAWG API → game metadata
            └─ per card: CheapShark price lookup
                 ├─ semaphore (max 2 concurrent)
                 ├─ 3s timeout per request
                 ├─ in-flight deduplication
                 └─ cache: 24h hit / 3min null
```

---

## Known High-Risk Areas

These are the areas most likely to contain real bugs. Review these first:

### 1. Auth & Token Security

```ts
// MUST check: is refresh token stored in httpOnly cookie or body?
// httpOnly + Secure + SameSite=Strict is required for both tokens.

// MUST check: is blacklist checked BEFORE jwt.verify?
const authenticate = (req, res, next) => {
  const token = extractBearerToken(req);
  if (tokenBlacklist.has(token)) return res.status(401).json({ error: "Token revoked" });
  // THEN verify
  jwt.verify(token, JWT_SECRET, { issuer, audience }, (err, payload) => { ... });
};

// MUST check: refresh rotation — old token blacklisted on each /auth/refresh call?
// MUST check: JWT_SECRET validated at startup (min 32 chars)?
// MUST check: timing-safe login (bcrypt.compare runs even for unknown email)?
```

**Common bugs here:**
- Tokens in localStorage instead of httpOnly cookies (XSS exposure)
- Blacklist checked after verify (token still usable if blacklist is skipped on error path)
- JWT_SECRET missing → server signs with `undefined`, accepts any token
- Timing attack: returning early when user not found reveals email enumeration

### 2. Price Caching & Semaphore

```ts
// Semaphore must release in finally — not just on success
const semaphore = new Semaphore(2);
const result = await semaphore.acquire();
try {
  return await fetchWithTimeout(url, 3000);
} finally {
  result.release(); // ← CRITICAL: must be in finally
}

// In-flight dedup: check Map before adding, delete in finally
if (inFlight.has(key)) return inFlight.get(key)!;
const promise = doFetch(key).finally(() => inFlight.delete(key));
inFlight.set(key, promise);
return promise;

// Null caching: 3-min TTL on null prevents thundering herd
// Check: is null stored as a sentinel value? Or does cache.get() return null for both miss and null result?
```

**Common bugs here:**
- Semaphore leaks if fetch throws (not using `finally`)
- In-flight map never cleared on error → all future requests for that title hang
- Cache treats null result same as cache miss → continuous re-fetching of games with no price

### 3. ITAD OAuth2 Integration

```ts
// ITAD uses client_credentials flow — token must be refreshed when expired
// Check: is token expiry tracked? Is it refreshed proactively or only on 401?
// Check: is the ITAD token stored in module scope (shared across requests)?
// Race: two simultaneous requests may both attempt token refresh
```

**Common bugs here:**
- Token refresh race condition: two concurrent requests both detect expiry and try to refresh simultaneously
- Token stored per-request (wasteful) or never refreshed (breaks after 1h)

### 4. Search Re-ranking Logic

```ts
// Fuse.js config
const fuse = new Fuse(results, {
  keys: ["name"],
  threshold: 0.45,     // lower = stricter match
  ignoreLocation: true,
  includeScore: true,
});

// Re-rank only when top Fuse score < 0.3 (high confidence match)
// score 0 = perfect, score 1 = no match
const fuseResults = fuse.search(query);
const topScore = fuseResults[0]?.score ?? 1;
if (topScore < 0.3) {
  return fuseResults.map(r => r.item); // use Fuse order
}
return results; // fall back to RAWG order
```

**Common bugs here:**
- Score threshold inverted (Fuse scores: 0=perfect, 1=worst — opposite of intuition)
- Fuse mutates results array (should pass a copy: `[...results]`)
- Re-ranking applied even when query is empty → scrambles default display

### 5. Socket.io Authentication

```ts
// Socket connections MUST be authenticated
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Unauthorized"));
  try {
    socket.data.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});
```

**Common bugs here:**
- No auth middleware on socket connections → anyone can receive deal alerts
- Token sent in query string instead of handshake.auth (logged by proxies)

### 6. Google OAuth Callback

```ts
// Callback page must be wrapped in Suspense (uses useSearchParams)
// next-auth v5-beta: session strategy must match cookie config
// Check: is NEXTAUTH_SECRET set and validated at startup?
```

---

## Checklist: Security Must-Haves

Run through this on every backend review:

- [ ] `helmet()` applied before all routes
- [ ] `hpp()` applied (HTTP parameter pollution)
- [ ] CORS: explicit `CORS_ORIGIN` env var, not `origin: "*"`
- [ ] `express-rate-limit`: global 2000/min + stricter on auth routes (5/15min login)
- [ ] All Joi schemas validate before DB queries
- [ ] MongoDB queries use typed fields, no raw string interpolation
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` validated at startup
- [ ] Passwords hashed with bcrypt rounds=12 (not 10)
- [ ] OTP codes hashed before storing in DB (not plain 6-digit)
- [ ] Password reset tokens: signed + short-lived (15min max)
- [ ] File uploads: mime-type + size validation in multer, store only in Cloudinary (not disk in prod)
- [ ] `httpOnly; Secure; SameSite=Strict` on both JWT cookies

---

## Checklist: Performance Must-Haves

- [ ] MongoDB indexes: `{ email: 1 }` unique on User, `{ userId: 1, gameSlug: 1 }` on Wishlist
- [ ] RAWG calls: use `Promise.allSettled` not `Promise.all` for batch
- [ ] Price cache: null results cached with short TTL (3min), not skipped
- [ ] No N+1: wishlist queries batch by userId, not per-game
- [ ] Client: `useCallback` / `useMemo` on stable functions passed to children
- [ ] Client: search debounced 500ms, min 2 chars before firing
- [ ] `next/image` used for all game covers with `sizes` prop

---

## Prioritized Fix List Format

After reviewing, output fixes in this exact format:

```
## Prioritized Fix List

### P0 — Security / Data Loss (fix before any deployment)
- [ ] [File/Area] Description of issue and exact fix

### P1 — Bugs Affecting Users in Production
- [ ] [File/Area] Description of issue and exact fix

### P2 — Performance / Reliability
- [ ] [File/Area] Description of issue and exact fix

### P3 — Code Quality / Maintainability
- [ ] [File/Area] Description of issue and exact fix
```

**Priority definitions:**
- **P0**: Security vulnerability, data loss, auth bypass, or secret exposure
- **P1**: Bug that breaks a feature for real users in production
- **P2**: Perf issue, cache miss, race condition under load, TypeScript unsafety
- **P3**: Naming, dead code, minor refactor — doesn't affect correctness

---

## Review Approach

1. **Ask which area to review** if not specified (backend, frontend, specific file, full review)
2. **Scan imports first** — unused imports signal dead code or missed refactors
3. **Follow data flow** — trace a request from route → middleware → service → DB → response
4. **Check error paths** — most bugs live in error/null handling, not the happy path
5. **Flag don't-fix** — point out issues clearly, don't rewrite the user's code unless asked
6. **Be specific** — cite file name, function name, line range when known
7. **Real issues only** — no style opinions, no "consider using X instead of Y" without a concrete bug

---

## Common Bugs Reference

| Area | Bug | Fix |
|------|-----|-----|
| Auth | JWT_SECRET not validated at startup | Throw at boot if missing or < 32 chars |
| Auth | Tokens in localStorage | Move to httpOnly cookies |
| Auth | Blacklist checked after verify | Blacklist check must be first |
| Auth | Early return on unknown email | Always run bcrypt.compare (dummy hash) |
| Auth | OTP stored plain | Hash OTP before storing |
| Cache | Semaphore not released on error | Use `finally` to release |
| Cache | In-flight map leaks on error | Delete key in `.finally()` |
| Cache | Null not cached | Store null sentinel with 3min TTL |
| ITAD | Token refresh race | Use a singleton promise for refresh |
| Search | Fuse score threshold inverted | 0=perfect, check `score < 0.3` for high confidence |
| Search | Fuse re-ranks empty query | Guard: `if (!query) return results` |
| Socket | No auth middleware | Add `io.use()` JWT check before connection |
| Frontend | `any` on API responses | Define response interfaces, use `unknown` + guard |
| Frontend | Missing Suspense on OAuth callback | Wrap `useSearchParams` consumers in Suspense |
| MongoDB | Missing indexes | Add compound index on Wishlist, unique on User.email |
| CheapShark | Using slug directly as title | `slug.replace(/-/g, " ")` |
