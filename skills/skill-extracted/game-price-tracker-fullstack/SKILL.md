---
name: game-price-tracker-fullstack
description: >
  Build and maintain a full-stack game price tracking application. Use this skill
  whenever the user is working on a game price tracker, game deals finder, or any
  app that fetches game metadata and compares prices across stores. Triggers on:
  building game search, price comparison endpoints, JWT auth for a game app,
  RAWG API integration, CheapShark API integration, game deal pages, featured
  games grids, store price tables, or any frontend/backend work for a game
  price app. Always use this skill when the user mentions RAWG, CheapShark,
  game price tracking, lowest price for games, or building any part of a
  game deal/price comparison fullstack app — even if they only ask about one piece.
---

# Game Price Tracker — Fullstack Skill

Guides Claude to build a production-grade game price tracking app: RAWG API for
game metadata, CheapShark API for live store prices, Express/TypeScript backend,
Next.js 15 App Router frontend.

## Stack at a glance

**Backend** (`/server`): Node.js · Express 5 · TypeScript (strict) · Mongoose ·
JWT (access 15m + refresh 7d) · bcrypt rounds=12 · Joi · express-rate-limit ·
helmet · hpp · morgan · multer · nodemailer · socket.io · cloudinary

**Frontend** (`/client`): Next.js 15 App Router · React 19 · TypeScript ·
Tailwind v4 · shadcn/ui · framer-motion · next-auth v5 · axios · react-toastify ·
use-debounce · lucide-react

---

## 1. Project Architecture

```
/
├── client/          # Next.js 15 App Router
│   ├── app/
│   │   ├── page.tsx            # HomePage
│   │   ├── games/[slug]/page.tsx   # GamePage
│   │   └── auth/page.tsx       # AuthPage
│   ├── next.config.ts          # MUST whitelist media.rawg.io for next/image
│   └── .env.local              # NEXT_PUBLIC_API_URL
└── server/          # Express 5 + TypeScript
    ├── src/
    │   ├── server.ts           # Entry: env validation, middleware, routes
    │   ├── auth/               # authMiddleware.ts, authRoutes.ts
    │   └── games/              # priceService.ts, priceRoutes.ts
    └── .env                    # All secrets
```

### Required environment variables

**Server `.env`:**
```
JWT_SECRET=          # min 32 chars — validate at startup, throw if missing
JWT_REFRESH_SECRET=  # min 32 chars — separate from JWT_SECRET
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
RAWG_API_KEY=
MONGODB_URI=
CLOUDINARY_URL=
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=
CORS_ORIGIN=         # explicit frontend URL in production
```

**Client `.env.local`:**
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
```

Always validate `JWT_SECRET` and `JWT_REFRESH_SECRET` at server startup:
```ts
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
  throw new Error("JWT_SECRET must be set and at least 32 characters");
```

---

## 2. Price Checking System

### Types

```ts
interface PriceResult {
  storeId: string;
  storeName: string;
  normalPrice: number;
  salePrice: number;
  savings: number;        // percentage 0-100
  dealRating: number;     // 0-10
  dealUrl: string;        // https://www.cheapshark.com/redirect?dealID=...
  isOnSale: boolean;
  lastUpdated: Date;
}

interface GameWithPrices {
  rawgId: number;
  slug: string;
  name: string;
  backgroundImage: string | null;
  rating: number;
  metacritic: number | null;
  genres: string[];
  platforms: string[];
  lowestPrice: PriceResult | null;  // allPrices[0] after sort
  allPrices: PriceResult[];         // sorted cheapest first
  cachedAt: Date;
}
```

### Cache (TTL-based, swap for Redis in prod)

```ts
class TTLCache<T> {
  private store = new Map<string, { data: T; expiresAt: number }>();
  set(key: string, data: T, ttlMs: number): void { ... }
  get(key: string): T | null { /* return null and delete if expired */ }
}

const PRICE_TTL  = 30 * 60 * 1000;   // prices change
const SEARCH_TTL = 60 * 60 * 1000;   // metadata stable
```

Cache keys: `game:<slug>` and `search:<query-lowercase>`.

### RAWG API calls

```ts
// Search
GET https://api.rawg.io/api/games?key=KEY&search=QUERY&page_size=20&ordering=-rating

// Single game
GET https://api.rawg.io/api/games/:slug?key=KEY
```

### CheapShark API

**Critical:** CheapShark uses game titles, NOT RAWG IDs. Strip hyphens from slug:
```ts
const title = slug.replace(/-/g, " ");
GET https://www.cheapshark.com/api/1.0/deals?title=TITLE&sortBy=Price&pageSize=10&onSale=0
```

Parse response fields as floats: `parseFloat(deal.normalPrice)`, etc.

### Parallel + concurrency-capped batch fetching

```ts
const CONCURRENCY = 5;  // cap to avoid RAWG rate limits

for (let i = 0; i < slugs.length; i += CONCURRENCY) {
  const batch = slugs.slice(i, i + CONCURRENCY);
  const settled = await Promise.allSettled(batch.map(getGameWithPrices));
  // push fulfilled values, log errors for rejected
}
```

Always use `Promise.allSettled` (not `Promise.all`) so one failure doesn't kill the batch.

### Retry with exponential backoff

```ts
const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delayMs = 500): Promise<T> => {
  try { return await fn(); }
  catch (err) {
    if (retries <= 0) throw err;
    const delay = axios.isAxiosError(err) && err.response?.status === 429
      ? delayMs * 4   // back off harder on rate limit
      : delayMs;
    await new Promise(r => setTimeout(r, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
};
```

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/games/search?q=` | — | RAWG search, min 2 chars, cached |
| GET | `/games/:slug/prices` | — | Single game + all store prices |
| POST | `/games/batch-prices` | Bearer | Array of slugs (1–20), enriched |
| GET | `/games/cache-stats` | Admin | Cache size for monitoring |

Rate limit all price endpoints: 30 req/min per IP.

---

## 3. Auth System

### Token pair

```ts
// Access token: short-lived, full user payload
jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: "15m", issuer: "game-price-tracker", audience: "game-price-tracker-client" })

// Refresh token: long-lived, minimal payload (id only)
jwt.sign({ id }, JWT_REFRESH_SECRET, { expiresIn: "7d", issuer: "game-price-tracker" })
```

### Token blacklist

```ts
const tokenBlacklist = new Set<string>();
// In production: Redis with TTL matching token expiry
```

Check blacklist before verifying signature in `authenticate` middleware.

### Refresh rotation

On every `/auth/refresh` call: verify old refresh token → blacklist it → issue new token pair. This limits the damage from a stolen refresh token.

### Endpoints

| Method | Path | Notes |
|--------|------|-------|
| POST | `/auth/register` | Rate limit 10/hr; Joi validate; hash with bcrypt 12 |
| POST | `/auth/login` | Rate limit 5/15min (skip success); constant-time compare |
| POST | `/auth/refresh` | Rotate token pair |
| POST | `/auth/logout` | Blacklist access token |
| GET | `/auth/me` | Requires authenticate middleware |

### Timing attack prevention on login

Always run bcrypt.compare even when user is not found, using a pre-computed dummy hash:
```ts
const DUMMY_HASH = "$2b$12$invalidhashpadding00000000000000000000000000000000000000";
const user = await User.findOne({ email }).select("+password");
const isValid = user
  ? await bcrypt.compare(password, user.password)
  : await bcrypt.compare(password, DUMMY_HASH);
if (!user || !isValid) return res.status(401).json({ error: "Invalid credentials" });
```

### Joi password validation

```ts
Joi.string()
  .min(8)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
  .required()
```

### Middleware

```ts
export const authenticate = (req, res, next) => {
  // 1. Extract Bearer token
  // 2. Check blacklist → 401 if found
  // 3. jwt.verify with issuer + audience options
  // 4. Set req.user = { id, email, role }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) return res.status(403).json({ error: "Insufficient permissions" });
  next();
};
```

---

## 4. Frontend Pages

### Shared patterns (apply everywhere)

- All API calls via: `const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL })`
- All prices: `price.toFixed(2)`, all savings: `Math.round(savings)`
- Dark theme: `bg-zinc-950` page, `bg-zinc-900` cards, `text-emerald-400` accents/prices
- `next/image` for all game covers — always set `fill` + `sizes` prop
- `react-toastify` for all errors: `toast.error("message")`
- `use-debounce` for search: `useDebounce(query, 350)`
- No `<form>` tags — use `onClick` handlers and controlled inputs

### HomePage (`app/page.tsx`)

```
[Hero Section]
  H1: "Find the lowest price for any game"
  Debounced search bar (350ms, min 2 chars triggers search)
    → dropdown with SearchResultItem (image, name, genres, metacritic)
    → clicking item navigates to /games/[slug]

[Featured Games Section]
  Title: "Best Deals" + "Live prices updated every 30 minutes"
  6-column grid (xl), 3-col (lg), 2-col (sm)
  Fetches via POST /games/batch-prices with curated slugs
  Skeleton loading: 6 animated gray rectangles
```

**GameCard** component:
- Cover image (h-40, object-cover, hover scale-105)
- Metacritic badge top-right: green ≥75, amber ≥50, red <50
- Gradient overlay bottom of image
- Game name (line-clamp-2, hover:text-emerald-400)
- Genre pills (max 2)
- PriceBadge: savings% badge + sale price + strikethrough normal price + store name
- Card: hover:-translate-y-1, hover:shadow-xl

### GamePage (`app/games/[slug]/page.tsx`)

```
[Hero Banner] h-72
  Background image opacity-40 + gradient overlay
  Back link top-left

[Game Info] -mt-24 relative z-10
  Metacritic badge + genre pills
  H1: game name (text-4xl font-black)
  Best price: large emerald mono text + savings badge

[Price Table]
  Header: "All prices (N stores)" + "Updated HH:MM:SS"
  If no prices: empty state with message
  Sorted cheapest first
  Best deal row: emerald border + bg-emerald-500/5 + "Best deal" label
  Each row (as <a href={dealUrl} target="_blank">):
    - Store name
    - Sale price (mono bold) + strikethrough normal price
    - Savings % badge
    - Deal rating bar (amber, 0-10 scaled to %)
    - External link icon
  Hover: -translate-y-0.5, shadow

[Platforms] border-t, small badges
```

Loading: skeleton for banner + title + 5 price rows
Error/404: centered emoji + message + back link

### AuthPage (`app/auth/page.tsx`)

```
[Toggle] "Login" / "Register" tab buttons

[Register form]
  - Username input (alphanum, 3-30 chars)
  - Email input
  - Password input + strength indicator
    Weak / Medium / Strong based on pattern matches

[Login form]
  - Email input
  - Password input
  - "Remember me" checkbox

[Submit button]
  On success → store tokens → router.push("/")
  On 429 → toast.error("Too many attempts, please wait")
  On 401 → toast.error("Invalid credentials")
```

---

## 5. Common Bugs — Always Check

| Bug | Fix |
|-----|-----|
| JWT_SECRET not validated at startup | `if (!JWT_SECRET \|\| JWT_SECRET.length < 32) throw` |
| CheapShark getting no results | Use `slug.replace(/-/g, " ")` as title, not slug directly |
| Cache key collision | Key as `game:<slug>` not just `<slug>` |
| Batch fetch blowing RAWG rate limit | Cap concurrency to 5 with the loop pattern above |
| Login timing attack | Always run bcrypt.compare even on not-found user |
| Broken next/image | Whitelist `media.rawg.io` in `next.config.ts` images.remotePatterns |
| CORS blocking frontend | Set `CORS_ORIGIN` env var, use it explicitly in cors() config |
| Token not invalidated on logout | Check blacklist BEFORE jwt.verify in authenticate |
| `any` types in TypeScript | Use strict generic types; `unknown` + type guards instead |
| Form submit page reload | No `<form>` tags; use `onClick` on `<button>` |

---

## 6. next.config.ts — Required

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.rawg.io",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
```

---

## Output Quality Bar

- TypeScript: strict mode, no `any`, explicit return types on exported functions
- Backend: all route handlers void-return, use early returns not else-chains
- Frontend: `"use client"` only on components with hooks/events; server components where possible
- All files must compile: `tsc --noEmit` clean
- Security: no secrets in source, env validated at startup
- Performance: parallel fetching, TTL cache, debounced search inputs
