---
name: itad-reference
description: >
  Complete engineer-level reference for the IsThereAnyDeal (ITAD) API v2.9.
  Use this skill whenever working with ITAD: fetching game prices, historical lows,
  deal lists, bundles, game ID lookup, shop maps, rate limits, auth headers, or
  any ITAD endpoint. Trigger on any mention of ITAD, IsThereAnyDeal, itad token,
  itad key, games/prices, games/overview, games/lookup, or itadHeaders.
  Always read this before writing any ITAD integration code.
---

# ITAD API v2.9 — Engineer Reference

**Base URL:** `https://api.isthereanydeal.com`  
**Spec version:** 2.9.0 (May 2025)  
**Docs:** https://docs.isthereanydeal.com  
**Register app / get keys:** https://isthereanydeal.com/apps/my/

---

## Auth

Two auth methods exist — both are valid, use one per request:

```
# Option A — query param (simplest, works everywhere)
GET /games/prices/v3?key=YOUR_API_KEY&country=US

# Option B — header (cleaner, preferred for POST bodies)
ITAD-API-Key: YOUR_API_KEY
```

**OAuth 2.0 (PKCE flow)** — only required for user-specific endpoints:
Waitlist (read/write), Collection (read/write), User Info, Notes, Sync, Notifications.
Public price/deal/lookup endpoints require API key only — OAuth is NOT needed.

**Startup check (add to server.ts):**
```ts
if (!process.env.ITAD_API_KEY) {
  console.warn("[ITAD] ITAD_API_KEY not set — ITAD price path disabled")
}
```

---

## Rate Limits

- **Window:** 5 minutes rolling
- **Default limit:** 1000 requests per window (verified-email accounts)
- **429 response:** includes `Retry-After` header (seconds to wait)
- **Ban risk:** attempts to work around limits result in permanent ban
- **Requirement:** implement proper caching — do not hit the API on every user request
- Limits visible on your app setup page at `isthereanydeal.com/apps/my/`

**Correct 429 handling:**
```ts
if (err.response?.status === 429) {
  const retryAfter = Number(err.response.headers['retry-after'] ?? 60)
  await sleep(retryAfter * 1000)
  // retry once
}
```

---

## ID System

ITAD uses UUID v7 identifiers (`018d937f-xxxx-7xxx-xxxx-xxxxxxxxxxxx`) for all games.
You cannot use Steam App IDs, GOG IDs, or titles directly in price/history endpoints.
**You must always resolve to an ITAD UUID first.**

---

## Endpoint Reference

### LOOKUP — resolve external IDs to ITAD UUIDs

---

#### `GET /games/lookup/v1` — Lookup by title OR Steam appid ✅ USE THIS

The single best lookup endpoint. Accepts either a title or a Steam appid.

```
GET /games/lookup/v1?key=KEY&appid=105600
GET /games/lookup/v1?key=KEY&title=Terraria
```

| Param | Type | Notes |
|---|---|---|
| `title` | string | Fuzzy-ish match. Less reliable than appid. |
| `appid` | number | Steam App ID integer. Most reliable. |

**Response:**
```json
{
  "found": true,
  "game": {
    "id": "018d937e-f835-710c-b95b-928e277b187e",
    "slug": "terraria",
    "title": "Terraria",
    "type": "game",
    "mature": false,
    "assets": {
      "banner145": "https://assets.isthereanydeal.com/...",
      "banner300": "https://assets.isthereanydeal.com/...",
      "banner400": "https://assets.isthereanydeal.com/...",
      "banner600": "https://assets.isthereanydeal.com/...",
      "boxart": "https://assets.isthereanydeal.com/..."
    }
  }
}
```

When not found: `{ "found": false, "game": null }`

**Important:** `appid` param accepts a plain integer, not `"app/105600"` format.

---

#### `POST /lookup/id/shop/{shopId}/v1` — Batch resolve by shop IDs

Resolve multiple shop-specific IDs to ITAD UUIDs in one call.
Steam shop ID = **61**.

```
POST /lookup/id/shop/61/v1
Content-Type: application/json
ITAD-API-Key: YOUR_KEY

["app/105600", "app/730", "app/220"]
```

**Response:** Map of shop ID string → ITAD UUID (or null if not found)
```json
{
  "app/105600": "018d937e-f835-710c-b95b-928e277b187e",
  "app/730":    "018d937f-1234-...",
  "app/220":    null
}
```

Note: a single Steam `app/XXXX` can resolve to multiple entries (bundles, subs).
Only `app/XXXX` keys reliably map to the game itself.

---

#### `POST /lookup/id/title/v1` — Batch resolve by exact titles

```
POST /lookup/id/title/v1
["Baldurs Gate 3", "Half-Life 2"]
```

**Not fuzzy** — must match precisely. Prefer `/games/lookup/v1?appid=` when possible.

---

#### `GET /games/search/v1` — Full-text search

```
GET /games/search/v1?key=KEY&title=cyberpunk&results=10
```

Returns array of game objects with `id`, `slug`, `title`, `type`, `mature`, `assets`.
`results` range: 1–100, default 20.
Use for autocomplete/search UI. Results include DLCs (type = "dlc") — filter if needed.

---

### PRICES

---

#### `POST /games/prices/v3` — Current prices across all stores ⭐ PRIMARY

```
POST /games/prices/v3?key=KEY&country=US
Content-Type: application/json

["018d937e-f835-710c-b95b-928e277b187e"]
```

Body: array of ITAD UUIDs (max batch size not publicly stated — keep to 20 to be safe).

**Query params:**
| Param | Type | Default | Notes |
|---|---|---|---|
| `country` | string | — | ISO 3166-1 alpha-2 (US, GB, DE, etc.) Affects currency and regional pricing |
| `deals` | — | off | Add `&deals` (no value) to return only active sale deals, not all prices |

**Response:** array, one object per UUID:
```json
[
  {
    "id": "018d937e-f835-710c-b95b-928e277b187e",
    "deals": [
      {
        "shop": { "id": 61, "name": "Steam" },
        "price": { "amount": 4.99, "amountInt": 499, "currency": "USD" },
        "regular": { "amount": 9.99, "amountInt": 999, "currency": "USD" },
        "cut": 50,
        "voucher": null,
        "storeLow": { "amount": 2.49, "amountInt": 249, "currency": "USD" },
        "flag": null,
        "drm": [{ "id": 1, "name": "Steam" }],
        "platforms": [{ "id": 1, "name": "Windows" }, { "id": 2, "name": "Mac" }],
        "timestamp": "2025-01-15T10:00:00+00:00",
        "expiry": null,
        "url": "https://itad.link/XXXXXXX/"
      }
    ]
  }
]
```

**Key fields:**
- `price.amount` — current sale price (float)
- `regular.amount` — full non-sale price (float)
- `cut` — discount % as integer (50 = 50% off)
- `storeLow` — all-time low FOR THIS STORE specifically
- `voucher` — coupon code string if available, else null
- `expiry` — ISO timestamp when deal ends, or null if unknown
- `flag` — special flag ("H" = historically low, etc.), often null
- `url` — ITAD affiliate link — MUST NOT be stripped or modified (ToS violation)
- `drm` — array of DRM systems
- `platforms` — Windows (1), Mac (2), Linux (3)

---

#### `POST /games/overview/v2` — Current best price + historical low ⭐ MOST USEFUL

One call returns both the current best deal AND the all-time historical low.

```
POST /games/overview/v2?key=KEY&country=US
Content-Type: application/json

["018d937e-f835-710c-b95b-928e277b187e"]
```

**Response per game:**
```json
{
  "id": "...",
  "current": {
    "shop": { "id": 61, "name": "Steam" },
    "price": { "amount": 4.99, "amountInt": 499, "currency": "USD" },
    "regular": { "amount": 9.99, "amountInt": 999, "currency": "USD" },
    "cut": 50,
    "voucher": null,
    "storeLow": { "amount": 2.49, "amountInt": 249, "currency": "USD" },
    "flag": null,
    "drm": [...],
    "platforms": [...],
    "timestamp": "2025-01-15T10:00:00+00:00",
    "expiry": null,
    "url": "https://itad.link/..."
  },
  "lowest": {
    "shop": { "id": 6, "name": "Fanatical" },
    "price": { "amount": 1.99, "amountInt": 199, "currency": "USD" },
    "regular": { "amount": 9.99, "amountInt": 999, "currency": "USD" },
    "cut": 80,
    "timestamp": "2023-11-23T00:00:00+00:00"
  },
  "low1y": {
    "shop": { "id": 6, "name": "Fanatical" },
    "price": { "amount": 2.49, "amountInt": 249, "currency": "USD" },
    "cut": 75,
    "timestamp": "2024-11-20T..."
  },
  "low3m": {
    "shop": { "id": 61, "name": "Steam" },
    "price": { "amount": 4.99, "amountInt": 499, "currency": "USD" },
    "cut": 50,
    "timestamp": "2025-01-01T..."
  },
  "bundles": [
    {
      "title": "Bundle Name",
      "url": "https://...",
      "note": null
    }
  ]
}
```

**`lowest` vs `low1y` vs `low3m`:**
- `lowest` — all-time historical low, any store, any time
- `low1y` — lowest in last 12 months
- `low3m` — lowest in last 3 months

`current` is the single best currently active deal across all stores.
If game is not on sale anywhere, `current` may be the regular price with `cut: 0`.

---

### HISTORY

---

#### `POST /games/historylow/v1` — All-time low per store

```
POST /games/historylow/v1?key=KEY&country=US
["018d937e-f835-710c-b95b-928e277b187e"]
```

Returns array of `{ shop, price, regular, cut, timestamp }` — one per store that has
ever sold the game. More granular than `overview/v2` which only returns the global low.

---

#### `POST /games/storelow/v1` — Current store low

Returns the lowest price each store currently offers, independent of whether it's on sale.

---

#### `GET /games/history/v1` — Price history log

```
GET /games/history/v1?key=KEY&id=ITAD_UUID&shop=61&country=US
```

Returns timestamped price history for one game on one shop. Use for price charts.
`shop` is optional — omit to get history across all shops.

---

### DEALS LIST

---

#### `GET /deals/v2` — Browse all active deals

```
GET /deals/v2?key=KEY&country=US&limit=20&offset=0&sort=cut:desc
```

| Param | Notes |
|---|---|
| `shops` | Comma-separated shop IDs to filter |
| `sort` | `cut:desc`, `price:asc`, `title:asc`, `time:desc`, `expiry:asc`, `added:desc` |
| `filter` | Price/cut filters e.g. `price:<10`, `cut:>50` |
| `limit` | Max results (default 20) |
| `offset` | Pagination offset |
| `country` | ISO country code |

**Response:** `{ nextOffset, hasMore, list: [...deals] }`

---

#### `POST /deals/v2` — Deals for specific games

```
POST /deals/v2?key=KEY&country=US
["018d937e-f835-...", "018d937f-1234-..."]
```

Returns deals only for the submitted ITAD UUIDs. Useful for wishlist deal checking.

---

### BUNDLES

---

#### `GET /games/bundles/v2` — Active bundles containing a game

```
GET /games/bundles/v2?key=KEY&id=ITAD_UUID&country=US
```

Returns array of bundles currently containing this game:
```json
[{ "id": "...", "title": "Humble Bundle Name", "url": "...", "note": null }]
```

Empty array = not in any active bundle.

---

### GAME INFO

---

#### `GET /games/info/v2` — Game metadata from ITAD

```
GET /games/info/v2?key=KEY&id=ITAD_UUID
```

Returns: `id`, `slug`, `title`, `type`, `mature`, `achievements`, `trading_cards`, `assets`.

---

### SHOPS

---

#### `GET /shops/v1` — All active shops

```
GET /shops/v1?key=KEY&country=US
```

Returns array of shops with `id`, `title`, `deals`, `games`, `url`.
Cache this for 24 hours — shop list changes rarely.

Key shop IDs (stable, confirmed):
| ID | Shop |
|---|---|
| 61 | Steam |
| 35 | GOG |
| 6 | Fanatical |
| 8 | Humble Store |
| 11 | Green Man Gaming |
| 26 | Epic Games Store |
| 37 | GamersGate |

#### `GET /shops/map/v1` — Shop ID to name map

```
GET /shops/map/v1?key=KEY
```

Returns `{ "61": "Steam", "35": "GOG", ... }`. Cache 24h.

---

### SUBSCRIPTIONS

---

#### `POST /games/subscriptions/v1` — Check subscription services

Returns which subscription services (Game Pass, EA Play, etc.) include a game.

```
POST /games/subscriptions/v1?key=KEY
["ITAD_UUID"]
```

---

## Terms of Service — Mandatory Rules

1. **MUST NOT** remove or modify affiliate tags in `url` fields
2. **MUST NOT** change price amounts — display as-is
3. **SHOULD** link back to IsThereAnyDeal or mention the API
4. **MUST NOT** impersonate or claim affiliation with ITAD
5. **MUST NOT** build a competing service
6. Commercial use OK if the app is public

---

## Common Mistakes

| Mistake | Correct behavior |
|---|---|
| Using `Bearer TOKEN` auth header | Use `ITAD-API-Key: YOUR_KEY` header |
| Passing `"app/105600"` to `/games/lookup/v1?appid=` | Pass integer: `?appid=105600` |
| Calling `/games/prices/v3` without an ITAD UUID | Must resolve UUID first via lookup |
| Calling `GET /games/lookup/v1` (old endpoint that 404s) | Use `GET /games/lookup/v1?appid=` or `?title=` — this IS the current endpoint |
| Using `nondeals` param (v2 era) | Use `deals` param (no value) instead |
| Not caching ITAD UUIDs | UUIDs are permanent — cache 7 days minimum |
| Not caching prices | Cache prices 15–30 min minimum |
| Ignoring `Retry-After` on 429 | Read and honor the header value |

---

## Recommended Cache TTLs

| Data | TTL |
|---|---|
| ITAD UUID (from lookup) | 7 days |
| Shop list `/shops/v1` | 24 hours |
| Current prices `/games/prices/v3` | 15–30 minutes |
| Price overview `/games/overview/v2` | 30 minutes |
| Historical low `/games/historylow/v1` | 24 hours |
| Bundle list `/games/bundles/v2` | 1 hour |
| Search results `/games/search/v1` | 10 minutes |
