# Skill Creation Prompt
## Game Discount APIs — CheapShark + ITAD Integration Skill

Use the following prompt with the **skill-creator** skill to generate a production-ready SKILL.md for your game discount app.

---

## THE PROMPT

```
Create a skill called "game-discount-api" for a fullstack game discount app.

The skill should teach Claude how to correctly use two APIs together — CheapShark and IsThereAnyDeal (ITAD) — to fetch, display, and contextualize game deals. The app publishes a page for each game showing the best current deals and historical context across stores.

---

## SKILL PURPOSE

This skill should be the authoritative reference for:
1. Which API to use for which job (CheapShark vs ITAD vs both)
2. The correct sequence of API calls for each user-facing feature
3. Exact endpoint URLs, all accepted parameters, and response field meanings
4. Pitfall avoidance (e.g., CheapShark savings is a string not a number, ITAD requires ID resolution before pricing calls, CheapShark doesn't support CORS natively)
5. Deal scoring and "is this a good deal?" logic using ITAD historical data
6. How to generate CheapShark redirect URLs for the buy button
7. Code patterns in TypeScript/JavaScript (fetch-based, no special SDK required for CheapShark; use api key header or query param for ITAD)

---

## APIS COVERED

### CheapShark
- Base URL: https://www.cheapshark.com/api/1.0/
- Auth: None (completely public, no API key)
- All prices: USD
- CORS: Not supported natively (requires server-side proxy when calling from browser)
- Redirect links format: https://www.cheapshark.com/redirect?dealID={dealID}

Key endpoints to document in depth:
- GET /stores → storeID map (cache this, rarely changes)
- GET /deals → main deal search with ALL parameters:
  - storeID, pageNumber (default 0), pageSize (default 60, max 60)
  - sortBy: "Deal Rating" | "Title" | "Savings" | "Price" | "Metacritic" | "Reviews" | "Release" | "Store" | "recent"
  - desc (boolean), lowerPrice, upperPrice (50 = no limit)
  - metacritic (minimum score), steamRating (minimum)
  - steamAppID (comma-separated list of Steam App IDs — most important for game page lookup)
  - title (partial match), exact (0/1), AAA (0/1), steamworks (0/1), onSale (0/1)
  - Response fields: dealID, title, storeID, salePrice, normalPrice, savings (STRING float — must parseFloat), metacriticScore, steamRatingText, steamRatingPercent, steamAppID, thumb, lastChange, releaseDate
- GET /deals?id={dealID} → single deal detail: priceHistory[], cheaperStores[], gameInfo.retailPrice
- GET /games?steamAppID={id} OR ?title={name} → game lookup; returns gameID, external (title), cheapest, cheapestDealID, steamAppID, thumb
- GET /games?id={gameID} → all active deals for a specific game across all stores
- Alerts system: GET /alerts?action=set|delete|manage&email=&gameID=&price=

### IsThereAnyDeal (ITAD)
- Base URL: https://api.isthereanydeal.com/
- API Version: 2.8.1
- Auth: API Key required — register at https://isthereanydeal.com/apps/my/ — pass as ?key=YOUR_KEY query param
- OAuth 2.0 PKCE: Only for user-specific features (Waitlist, Collection) — not needed for price lookups
- Multi-currency support: pass ?country=US (ISO code) to get regional pricing
- ITAD uses internal UUID system — must resolve titles or Steam IDs to ITAD UUIDs before calling price endpoints
- Steam shop ID in ITAD system: 61

Key endpoints to document in depth:

LOOKUP / ID RESOLUTION (must do this first):
- POST /lookup/id/shop/61/v1 → resolve Steam App IDs to ITAD UUIDs
  Body: ["app/1091500"] → Response: {"app/1091500": "018d937f-xxxx-..."}
  This is the preferred path when you already have a Steam App ID
- POST /lookup/id/title/v1 → resolve exact titles to ITAD UUIDs (not fuzzy — must be exact)
- GET /games/search/v1?title=&results= → fuzzy title search, returns id+slug+title

PRICING (requires ITAD UUID):
- POST /games/prices/v3?key=KEY&country=US → current prices across all stores
  Body: array of ITAD UUIDs
  Response per game: deals[] each with: shop.name, shop.id, price.amount, price.currency, regular.amount, cut (integer % discount), drm[], platforms[], url (affiliate link), voucher (coupon code if any), expiry
  Optional param: &deals=1 to only return games that are currently on sale
  
- POST /games/overview/v2?key=KEY&country=US → THE MAIN ENRICHMENT ENDPOINT
  Body: array of ITAD UUIDs
  Response per game: 
    current: {shop, price.amount, price.currency, regular.amount, cut, url}
    lowest: {shop, price.amount, cut, timestamp} ← all-time historical low

- POST /games/historylow/v1?key=KEY → all-time low per store (granular, store-by-store lows)
  Body: array of ITAD UUIDs
  Response: lows[] per game, each with shop + price + timestamp

- GET /games/history/v2?key=KEY&id={itadId} → timestamped price history log for charts

BUNDLES:
- GET /games/bundles/v2?key=KEY&id={itadId} → active bundles containing this game

GLOBAL DEALS:
- GET /deals/v2?key=KEY&shops=&sort=cut|price|title|time|expiry|added&desc=&offset=&limit= → global deal browser

SHOPS:
- GET /shops/v1?key=KEY → all ITAD-tracked shops with IDs (cache this)

---

## INTEGRATION PATTERNS TO INCLUDE

The skill must include these concrete integration patterns as named sections:

### Pattern 1: "Game Page Full Enrichment" (the core app flow)
Triggered when a user lands on any game's page in the app.
Step 1: If steamAppID is known → CheapShark GET /games?steamAppID={id} (instant, no auth, returns all current deals)
Step 2: ITAD POST /lookup/id/shop/61/v1 with ["app/{steamAppID}"] → get ITAD UUID
Step 3: ITAD POST /games/overview/v2 with [itadUUID] → get current best price + all-time low
Step 4: ITAD GET /games/bundles/v2?id={itadUUID} → check for bundle availability
Combine results on the page: store prices from CheapShark (with redirect links), historical context from ITAD

### Pattern 2: "Is This A Good Deal?" Scoring Logic
Using ITAD overview response:
- If current deal price ≤ historical lowest price × 1.05 → show "Near All-Time Low 🔥" badge
- If current cut ≥ 75 → show "Exceptional Deal" badge
- If current cut ≥ 50 → show "Great Deal" badge
- If current price > historical lowest × 1.5 → show "Seen cheaper before" note
Always show: "All-time low: ${lowest.price.amount} on {lowest.shop.name} ({timestamp})"

### Pattern 3: "Quick Deal Search" (browse page)
CheapShark GET /deals with: sortBy=Savings, onSale=1, pageSize=60, optional upperPrice/metacritic filters
Parse savings: parseFloat(deal.savings).toFixed(0) → display as "75% off"
Generate buy link: https://www.cheapshark.com/redirect?dealID={deal.dealID}

### Pattern 4: "Price Alert Registration"
CheapShark GET /alerts?action=set&email={email}&gameID={gameID}&price={targetPrice}
Note: gameID here is CheapShark's internal gameID (from /games endpoint), not Steam App ID

### Pattern 5: "Find Deals by Steam App IDs" (batch lookup)
CheapShark GET /deals?steamAppID={id1,id2,id3}&onSale=1
Returns deals for multiple specific games in one call — useful for wishlist pages

---

## CRITICAL GOTCHAS TO DOCUMENT

These are common mistakes — document them as warnings:

1. CheapShark `savings` field is a STRING formatted as "75.000000" — always parseFloat() it before using
2. CheapShark does NOT support CORS — all calls from a browser frontend must go through your backend/proxy
3. ITAD requires ID resolution BEFORE pricing calls — you cannot call /games/prices/v3 with a Steam App ID directly, you must first resolve it to an ITAD UUID
4. CheapShark `upperPrice=50` is treated as "no upper limit" — to filter to games under $50, use 49.99
5. CheapShark `pageSize` max is 60 — paginate with `pageNumber` for more results
6. ITAD `cut` is an integer (75 = 75% off); CheapShark `savings` is a string float ("75.000000") — different formats for the same concept
7. CheapShark deal redirect links MUST use the redirect URL format, not the raw store URL — do not strip or modify dealID
8. ITAD terms of service: you MUST NOT remove affiliate tags from ITAD URLs, and you MUST link back to or credit IsThereAnyDeal
9. CheapShark terms: all prices are USD only — display a currency notice if your users are international
10. ITAD `deals` param behavior: by default /games/prices/v3 returns ALL prices (even non-sale); add &deals=1 to filter to only active sales

---

## CODE PATTERNS TO INCLUDE

Include TypeScript examples for:

1. Store ID cache initialization (CheapShark + ITAD shops, fetched once on app start)
2. Full game page enrichment function combining both APIs
3. Deal scoring utility function (takes ITAD overview response, returns badge label)
4. CheapShark redirect URL generator
5. ITAD Steam App ID → UUID resolver with error handling
6. Batch deal fetch by array of Steam App IDs (wishlist use case)

All code should use native fetch(), async/await, proper error handling with try/catch, and TypeScript types.

---

## SKILL DESCRIPTION (for triggering)

The skill description field should be:

"Build and integrate the CheapShark and IsThereAnyDeal (ITAD) APIs for a game discount app. Use this skill whenever working on: fetching game deals or prices from CheapShark or ITAD, building game deal pages, integrating CheapShark /deals or /games endpoints, integrating ITAD price overview or history endpoints, generating deal redirect links, implementing deal scoring or 'is this a good deal?' logic, comparing current prices to historical lows, building bundle detection, or writing any backend/frontend code that calls either CheapShark or IsThereAnyDeal APIs. Always trigger this skill before writing any code that touches these APIs — even for small features like a single endpoint call."

---

## OUTPUT FORMAT

The skill should be structured as:
- YAML frontmatter: name, description
- Section 1: API overview table (CheapShark vs ITAD at a glance)
- Section 2: CheapShark endpoint reference (all endpoints + params + response fields)
- Section 3: ITAD endpoint reference (all endpoints + params + response fields)
- Section 4: Integration patterns (the 5 named patterns above)
- Section 5: Critical gotchas (all 10 warnings)
- Section 6: TypeScript code patterns
- Section 7: Deal scoring reference table

Keep the SKILL.md under 500 lines by being concise but complete. Use tables wherever possible instead of prose lists.
```

---

## How to Use This Prompt

1. Open a new Claude chat session
2. Type: "I want to create a skill" (this triggers the skill-creator skill)
3. When Claude asks what you want the skill to do, paste the entire prompt block above
4. Claude will draft the SKILL.md, offer to test it, and package it as a `.skill` file
5. Install the `.skill` file in your Claude project

Once installed, Claude will automatically consult this skill whenever you're working on any part of your app that touches these APIs — giving you accurate endpoint guidance, parameter lists, and code patterns without having to look up the docs yourself.
