---
name: console-stores-reference
description: >
  Engineer reference for Xbox (Microsoft Store), Nintendo eShop, and PlayStation
  Store — covering API availability, policies, rate limits, search systems, and
  exactly how each store integrates with DisLow. Use this skill before writing
  any code that touches Xbox, Nintendo, or PlayStation pricing, availability,
  or deep-links. Trigger on: Xbox API, Nintendo eShop API, PlayStation Store API,
  console store prices, Game Pass, Switch prices, PS Store prices.
---

# Console Stores — Engineer Reference for DisLow

## Summary Table

| Store | Official API | Price API | ITAD Coverage | Best Integration |
|---|---|---|---|---|
| Xbox / Microsoft Store | ❌ No public API | Partial (DisplayCatalog, unofficial) | ✅ Yes (ITAD shop ~ID varies) | ITAD primary, DisplayCatalog fallback |
| Nintendo eShop | ❌ No public API | ❌ No reliable endpoint | ✅ Yes (ITAD covers eShop) | ITAD via console edition UUID |
| PlayStation Store | ❌ No public API | ❌ Requires PSN auth token | ❌ ITAD does not track PS prices | Badge + deep-link only |

---

## Xbox / Microsoft Store

### Policy
- No official developer API for public game pricing
- Microsoft's DisplayCatalog endpoint is an **internal API** used by their own website — not documented, no ToS, no rate limits published
- Scraping or using undocumented endpoints risks IP ban with no warning
- **Xbox Game Pass** availability CAN be checked via ITAD's `/games/subscriptions/v1` endpoint

### What ITAD provides
ITAD **does** track Microsoft Store PC game prices. In DisLow's terminal output you've already seen:
```
• Microsoft Store  $29.99    (0% off)      → https://itad.link/...
```
This covers **PC games sold on the Microsoft Store** (the Windows Store / Xbox PC app).

**Important distinction:**
- `Microsoft Store (PC)` — tracked by ITAD ✅ — this is the Xbox PC app store
- `Xbox console store` — same store, different SKUs — ITAD may or may not have console SKU prices

### DisplayCatalog (unofficial fallback only)
```
GET https://displaycatalog.mp.microsoft.com/v7.0/products
  ?market=US
  &languages=en-us
  &bigIds=PRODUCT_ID     ← the 9-character Xbox product ID (e.g. 9P8RQKGHKHBX)
```

**How to get the Xbox product ID:**
- From the Xbox store URL: `xbox.com/en-US/games/store/game-name/9P8RQKGHKHBX` → product ID = `9P8RQKGHKHBX`
- From RAWG: `game.stores` → find the Xbox store entry → extract ID from URL

**Response shape (simplified):**
```json
{
  "Products": [{
    "ProductId": "9P8RQKGHKHBX",
    "LocalizedProperties": [{ "ProductTitle": "Hollow Knight" }],
    "DisplaySkuAvailabilities": [{
      "Sku": { "SkuType": "full" },
      "Availabilities": [{
        "OrderManagementData": {
          "Price": {
            "ListPrice": 14.99,
            "MSRP": 14.99,
            "CurrencyCode": "USD"
          }
        }
      }]
    }]
  }]
}
```

**Rate limits:** Unknown — treat as fragile. Cache 1 hour minimum.

**DisLow integration rule:**
- Use ITAD as primary source for Microsoft Store prices
- Only fall back to DisplayCatalog if ITAD does not return a Microsoft Store deal AND a Xbox product ID is known from RAWG store data
- Never call DisplayCatalog on every request — cache aggressively

### Xbox Game Pass check (via ITAD)
```
POST https://api.isthereanydeal.com/games/subscriptions/v1?key=KEY
Content-Type: application/json

["ITAD_UUID"]
```
Returns which subscription services include the game. Check for `"Xbox Game Pass"` or `"PC Game Pass"` in the response.
Cache 24 hours — Game Pass catalog changes daily but not per-game-per-minute.

### Deep-link format
```
https://www.xbox.com/en-US/games/store/{slug}/{productId}
```
If only product ID is known (no slug): `https://www.microsoft.com/store/productId/{productId}`

---

## Nintendo eShop

### Policy
- No official public API — Nintendo has never released one
- Regional APIs exist per-country (US, EU, JP) — all unofficial
- Nintendo actively blocks bots on their store website
- No scraping allowed per Nintendo's ToS
- **ITAD tracks Nintendo eShop prices** — this is the only reliable source

### What ITAD provides
ITAD indexes Nintendo eShop prices for games available on Switch. These appear as a **separate ITAD game entry** from the PC/Steam version:
- PC: "Hollow Knight" → ITAD UUID A
- Switch: "Hollow Knight: Voidheart Edition" → ITAD UUID B (different entry)

**This is why DisLow needs `findConsoleEditionIds()`** — searching ITAD by title finds the Switch edition UUID, then `fetchItadDeals()` returns the Nintendo eShop price.

### ITAD search for Switch editions
```
GET https://api.isthereanydeal.com/games/search/v1
  ?key=KEY
  &title=Hollow Knight
  &results=10
```
Filter results where:
1. `type === "game"` (not DLC)
2. Title starts with the original title
3. Title contains an edition keyword: "edition", "enhanced", "remastered", "definitive", "complete", "ultimate", "collection"

This catches "Hollow Knight: Voidheart Edition" but excludes "Hollow Knight: Silksong" (sequel, no edition keyword).

### Nintendo eShop URL format
```
https://www.nintendo.com/us/store/products/{slug}/
```
The slug comes from the ITAD deal's `url` field after following the redirect, OR from RAWG's `stores` array for the Nintendo entry.

**Do NOT construct Nintendo URLs manually** — use ITAD's affiliate `url` field directly.

### Regional pricing note
Nintendo eShop prices vary significantly by region (US vs EU vs JP). ITAD returns US prices when `country=US` is passed to `/games/prices/v3`. The `country` param on that endpoint controls this.

### Rate limits
Same as ITAD: 1000 requests per 5-minute window. Nintendo eShop prices via ITAD are covered by the same ITAD cache TTL rules (30 min for prices).

---

## PlayStation Store

### Policy
- **No public API exists** — Sony has never released one
- The PS Store web app uses an internal GraphQL API (`web.np.playstation.com/api/graphql/v1/op`) that requires a **PSN OAuth token** tied to a user account
- Getting a PSN token requires user login via PlayStation's OAuth flow (Client ID + Client Secret from a registered PSN app)
- Even with a token, using it for automated price scraping violates PlayStation's ToS
- Community projects (psn-api npm package) wrap this but require a user's PSN account credentials

### What ITAD provides
**ITAD does NOT track PlayStation Store prices.** Sony does not allow price data aggregation. PS Store prices will never appear in ITAD responses.

### DisLow integration approach
Since no price data is available, DisLow shows:
1. **"Available on PlayStation" badge** — derived from RAWG's `platforms` field (already in game data)
2. **PS Store search deep-link** — links the user directly to the PS Store search page

**Deep-link format:**
```
https://store.playstation.com/en-us/search/{game-title-url-encoded}
```
Example: `https://store.playstation.com/en-us/search/Hollow%20Knight`

**Do NOT show a price for PlayStation** — there is no reliable source. Show "View on PS Store →" as a link instead.

### Platform badge detection
RAWG returns `platforms` array on game detail:
```json
"platforms": [
  { "platform": { "id": 187, "name": "PlayStation 5", "slug": "playstation5" } },
  { "platform": { "id": 18, "name": "PlayStation 4", "slug": "playstation4" } }
]
```
RAWG platform IDs for PlayStation:
| ID | Platform |
|---|---|
| 187 | PlayStation 5 |
| 18 | PlayStation 4 |
| 16 | PlayStation 3 |
| 15 | PlayStation 2 |

---

## DisLow Integration Rules (Summary)

### For Microsoft Store / Xbox
1. ITAD primary → if ITAD returns "Microsoft Store" deal, use it (already working)
2. Console edition search → `findConsoleEditionIds()` catches Xbox console editions
3. Game Pass badge → `POST /games/subscriptions/v1` after getting ITAD UUID
4. DisplayCatalog → fallback only, cache 1 hour, only when ITAD has no MS Store deal

### For Nintendo eShop
1. ITAD primary via console edition → `findConsoleEditionIds()` finds Switch editions
2. Filter: `isConsoleEdition()` with edition keywords prevents false matches (sequels)
3. Cache ITAD edition IDs 6 hours — these don't change
4. Do NOT call any Nintendo API directly — no public endpoint exists

### For PlayStation Store
1. Show platform badge only (from RAWG platforms data)
2. Deep-link to `store.playstation.com/en-us/search/{title}` — no price shown
3. Label the link "View on PS Store" not a price row
4. Never attempt to scrape or call PS internal GraphQL — ToS violation

---

## Common Mistakes

| Mistake | Correct behavior |
|---|---|
| Looking for "Xbox Store" in ITAD shop list | Look for "Microsoft Store" — same shop |
| Expecting Nintendo prices without console edition UUID | Must find Switch edition via ITAD search first |
| Trying to show PS Store price | No reliable source — show badge + link only |
| Calling DisplayCatalog on every request | Cache minimum 1 hour — it's an unofficial endpoint |
| Using `isConsoleEdition()` without edition keyword filter | "Silksong" would match "Hollow Knight" incorrectly |
| Constructing Nintendo URLs manually | Use ITAD affiliate `url` field — ToS requires it |

---

## Cache TTLs

| Data | TTL |
|---|---|
| ITAD console edition IDs | 6 hours |
| Microsoft Store price (ITAD) | 30 minutes (same as all ITAD prices) |
| Nintendo eShop price (ITAD) | 30 minutes |
| Game Pass membership (ITAD subscriptions) | 24 hours |
| Xbox DisplayCatalog price | 1 hour |
| PlayStation badge (from RAWG) | Same as game detail cache (10 min) |
