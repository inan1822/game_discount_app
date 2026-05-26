---
name: game-price-orchestrator
description: >
  Build, debug, and review code that fetches and displays game prices for DisLow
  (or any game-deal app) using the RAWG + ITAD + CheapShark trio. Use whenever
  the user mentions: card prices, store prices, "Unknown" prices, "Free"
  detection, ITAD UUID resolution, CheapShark title matching, lowest-price
  calculation, price caching, discount badges, or anything involving game-card
  price rows or the game-detail Discounts tab. Always performs senior-engineer
  code review on every change.
---

# Game Price Orchestrator

You are the authority on combining three game-price APIs into ONE reliable "show the lowest price right now" pipeline. The three APIs are independent — none depends on another's filtering — and together they must cover every possible game state (legacy, giveaway, multi-edition, console-only, just-released, etc.).

---

## The Three APIs — read these BEFORE writing code

- **RAWG** — https://api.rawg.io/docs/ — game catalog & metadata. Provides cover, name, genres, platforms, and `stores[]` (only on `/games/:id` detail, NOT list endpoints). Extract `steamAppId` from the Steam store URL.
- **ITAD** — https://docs.isthereanydeal.com/ — PC store prices keyed by UUID. Key endpoints:
  - `GET /games/lookup/v1?title=` — single exact-ish result
  - `GET /games/search/v1?title=&results=N` — multiple candidates (use Fuse.js to rank)
  - `POST /games/prices/v3` — batch deals for up to ~200 UUIDs at once
  - `POST /games/overview/v2` — current best deal per UUID (response shape inconsistent — prefer `prices/v3`)
- **CheapShark** — https://apidocs.cheapshark.com/ — aggregated deals + Epic/Steam giveaway detection. Key endpoints:
  - `GET /api/1.0/games?title=&limit=N` — game search with `cheapest` field
  - `GET /api/1.0/games?id=<gameID>` — specific game's deals
  - `GET /api/1.0/deals?gameID=&sortBy=Price` — deals by gameID (reliable, not title)
  - `GET /api/1.0/stores` — store id → name + icon

---

## The Cardinal Rules

1. **ITAD and CheapShark are PEERS, not chained.** Never pass an ITAD result through a CheapShark filter or vice versa. Each independently produces a candidate price; the orchestrator picks the lowest.
2. **Always display the lowest price.** Final price = `min(itadLowest, cheapSharkLowest)`. Show `Free` if either reports `0.00`.
3. **CheapShark must have its OWN Google-level search.** Never reuse ITAD's matching. CheapShark search needs:
   - Multi-pass title normalization (punctuation, articles, roman numerals ↔ digits, edition suffixes, `™®©`, accented chars, ampersand ↔ "and")
   - Tries multiple variants: original, stripped subtitle, stripped edition, no special chars, common rewrites ("&" ↔ "and", "II" ↔ "2"), franchise-only prefix
   - Validates each candidate with Fuse.js (`threshold: 0.35`) against the original AND each variant
   - Confidence threshold: accept only top match scoring < 0.35 on at least one variant
   - Logs every miss with the candidates returned, so we can audit & extend the rewrite list
4. **ITAD search also needs variant expansion** (same rewrite engine). RAWG "Grand Theft Auto IV" vs ITAD "Grand Theft Auto IV: The Complete Edition" must resolve.
5. **Cache must allow re-checking.** Cached `null` from a title-only lookup MUST be re-checked if (a) `steamAppId` becomes available, or (b) the game hasn't been through the cross-source check yet. Track these flags per game id.
6. **Free wins.** If any source reports the game free RIGHT NOW (`cheapest === "0.00"` on CheapShark or `price === 0` on ITAD), display `Free` regardless of paid prices elsewhere.
7. **No fuzzy match without proof.** Loose matches MUST log the matched title alongside the searched title so we can audit (`[ITAD] search "X" → "Y"` and `[CheapShark] "X" → "Y" (score 0.21)`).
8. **All three APIs must be optional.** App must still render if any one is down (rate-limited / 429 / network error). Empty results never throw.

---

## Card Display Spec (NEVER deviate)

The price row is **always rendered**. Four states:

| State | Source | Display | Color |
|---|---|---|---|
| Loading (undefined) | hook hasn't resolved | `···` | rgba(255,255,255,0.18) |
| Unknown (null) | all sources returned null | `Unknown` (smaller) | rgba(255,255,255,0.30) |
| Free (isFree:true) | min price = 0 anywhere | `Free` | #48BCF9 (cyan) |
| Paid | min price > 0 | `$X.XX` | #5BDE8A (green) |

If `cut > 0`: prepend green `-X%` pill (`background: rgba(68,214,44,0.15)`, `color: #44d62c`, `borderRadius: 4`).

---

## Card Display ASCII Diagram

```
┌──────────────────────────────┐
│  ★ favorite                  │  ← top-right glass star
│                              │
│        cover image           │  ← full-bleed, hover scale 1.05
│        (gradient overlay)    │
│                              │
│ ┌──────────────────────────┐ │  ← bottom glass overlay
│ │ Game Title (15px bold)   │ │
│ │ Genre · Genre (12px)     │ │
│ │ [PC][PS][Xbox]    -20%   │ │  ← discount badge (green)
│ │                  $31.99  │ │  ← price (always shown)
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

Rule: price row is always rendered. Never collapse to empty. Four states:

- `···` (undefined, 18% white) — fetching
- `Unknown` (30% white, smaller) — both sources returned null
- `Free` (cyan #48BCF9) — `isFree: true`
- `$X.XX` (green #5BDE8A) — paid; optional `-X%` green pill to left if cut > 0

Plus a **Lowest Price Ever** trophy section (historical low from ITAD) on the detail page.

---

## Game Page Spec (Discounts tab)

Same orchestrator; displays the full deals table sorted by price ascending. Each row = real store deal (Steam, GMG, Epic, Fanatical, GOG, etc.) with icon, price, discount %, "Buy →" linking to the **direct store URL from ITAD `prices/v3`** OR the CheapShark `dealLink` redirect. Mark cheapest row with green `BEST PRICE` badge. Below the table: trophy + "Lowest Price Ever" (ITAD historical low via `/games/storelow/v2`).

---

## Orchestrator Algorithm (canonical)

```ts
async function getLowestPrice(game: { id, name, steamAppId? }): Promise<CardPrice | null> {
    // Fire both sources in parallel — independent peers
    const [itad, cs] = await Promise.allSettled([
        itadLookupAndPrice(game),    // resolves UUID via appId or title-variants → prices/v3
        cheapSharkSearchAndPrice(game.name),  // own search engine, no ITAD dependency
    ])
    const itadPrice = itad.status === 'fulfilled' ? itad.value : null
    const csPrice   = cs.status   === 'fulfilled' ? cs.value   : null

    // Free wins
    if (itadPrice?.isFree || csPrice?.isFree) return { ...(itadPrice ?? csPrice!), isFree: true, price: 0 }

    // Both null → Unknown
    if (!itadPrice && !csPrice) return null

    // Pick the lower of the two paid prices
    if (itadPrice && csPrice) return itadPrice.price <= csPrice.price ? itadPrice : csPrice
    return itadPrice ?? csPrice
}
```

---

## Deals Table Example

```
[Steam icon] Steam        $14.99   -50%   [Buy →]
[GMG icon]   GMG          $13.20   -56%   [Buy →]  ← BEST PRICE
[Epic icon]  Epic Games   Free     -100%  [Buy →]
```

---

## Senior Review Checklist

Before reporting "done", check:

1. **Concurrency** — are both API calls actually parallel (`Promise.allSettled`)? No accidental `await` chain.
2. **Cache correctness** — does the cache bypass re-check stale nulls when new info appears?
3. **Title variant coverage** — has the rewrite engine been updated for any new failure case in logs?
4. **Free detection** — does `isFree` propagate even when only ONE source reports it?
5. **Error isolation** — does one API timeout/429 still let the other succeed?
6. **Display fallback** — does the card render all four states correctly (incl. Unknown dimmed, not hidden)?
7. **Logs** — every match, every miss, every variant tried, with the exact strings (no silent catches).
8. **Rate limits** — CheapShark semaphore in place, ITAD batched ≤200 UUIDs, RAWG enrichment debounced.
9. **No prop drilling** — card components use `useCardPrice(game)` hook, NOT receive price as prop.
10. **Type safety** — `CardPrice | null | undefined` (three states), `isFree` boolean separate from `price === 0`.

---

## Debugging "Unknown" bugs

When asked to fix a "still shows Unknown" bug, ALWAYS:

1. Tail backend logs for the specific game name
2. Identify which source(s) returned what
3. Either: add a new title variant rule OR fix a matching bug OR add the game to a known-good-mapping override
4. Verify the fix on the actual game (not just unit test)
5. Add a regression case to the rewrite-engine variants list

---

## Files to Know

**Backend**
- `src/featchers/games/games.service.ts` — `getCardPricesService`, `lookupItadIdByTitle`, `checkCheapSharkFree`, `getGameDealsService`

**Frontend**
- `client/hooks/useCardPrice.ts` — batched hook (the ONLY way components read prices)
- `client/components/game/GameCard.tsx` — base card
- `client/components/game/PopularCarousel.tsx`, `NewBentoGrid.tsx`, `FavoritesShelf.tsx`, `ByGenre.tsx` — variant cards
- `client/app/game/[id]/page.tsx` — detail page Discounts tab
