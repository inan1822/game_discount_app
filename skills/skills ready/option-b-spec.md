# Option B Implementation Spec — Smart Stale-While-Revalidate

> Self-briefing document. Read this before writing any code.

## Goal

Implement Option B from the price-orchestrator discussion:
- Show cached price instantly (current speed)
- Refresh stale/null/low-confidence entries in the background
- Next render shows the corrected price
- Always display `min(itad, cs)` — Free wins
- Close the home-page-vs-game-page accuracy gap by persistently caching `rawgId → steamAppId` mappings discovered via RAWG `/games/:id`

Constraint: **API calls per render must NOT 10× compared to current behavior.** The skip rules below exist for that reason.

## Non-goals

- Replace `getCardPricesService` interface (keep its shape: `games[] → Record<gameId, CardPrice | null>`)
- Frontend changes beyond hook-level (no progressive streaming, no SSE)
- Replace ITAD/CheapShark with another data source

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  getCardPricesService(games[])                      │
│                                                      │
│  1. Apply KNOWN_STEAM_APPIDS override                │
│  2. Apply KNOWN_FREE_TITLES override                 │
│  3. Read cache for each game                         │
│  4. For each game, classify:                         │
│      - serve_cache_only      (fresh + confident)    │
│      - serve_cache_and_refresh (stale OR low-conf)  │
│      - must_fetch_blocking   (no cache at all)      │
│  5. Return cache-served values immediately for      │
│     "serve_*" entries                                │
│  6. Fire blocking fetches for "must_fetch"          │
│  7. Fire background refresh for "serve_and_refresh" │
│     (don't await — let the next request see it)     │
│  8. Merge blocking results into response             │
│  9. Cache writes happen at end of each fetch        │
└─────────────────────────────────────────────────────┘
```

## Pipeline (per uncached / refreshing game)

```
                ┌─────────────────────────┐
                │ Resolve steamAppId      │
                │                         │
  override map ─┤ KNOWN_STEAM_APPIDS      │
  caller-passed ┤ g.steamAppId            │
  persistent  ──┤ rawgIdToSteamAppId cache│
  RAWG /id ────┤ (one-time, on miss)     │
                └────────────┬────────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │  PARALLEL (Promise.all)  │
              ├──────────────┬───────────┤
              │ ITAD lookup  │ CheapShark│
              │ via appid    │ via appid │
              │ → prices/v3  │ if known  │
              │              │ else title│
              └──────┬───────┴─────┬─────┘
                     │             │
                     └──────┬──────┘
                            ▼
                   ┌─────────────────┐
                   │  mergeCardPrices │
                   │  Free > min > one│
                   └─────────────────┘
```

## SWR classification rules

A cache entry is **fresh + confident** if ALL of:
- `expiresAt > now`
- Cached price is not `null` (null is never trusted as a final answer)
- One of:
  - Was resolved via `KNOWN_STEAM_APPIDS` (verified)
  - Was resolved via caller-supplied `steamAppId` (verified)
  - Was resolved via a `rawgIdToSteamAppId` cache hit (verified)

A cache entry is **stale OR low-confidence** if ANY of:
- `expiresAt < now + STALE_THRESHOLD` (e.g. less than 5 min of TTL remaining)
- Cached price is `null` AND `csCheckedIds` entry is expired
- Was resolved via title-only lookup (no steamAppId source)

An entry is **must_fetch_blocking** if there is no cache at all.

These rules require storing **provenance** alongside each cache entry:
```ts
type CacheEntry = {
  cp: CardPrice | null
  expiresAt: number
  source: 'override' | 'steamAppId' | 'rawgIdCache' | 'titleLookup'
}
```

## Persistent `rawgId → steamAppId` resolver cache

Purpose: close the gap where the game page has a steamAppId (extracted from RAWG `/games/:id` stores) but the home card never gets one (RAWG `/games` list endpoint omits stores).

Storage: file-backed (`src/cache/rawg-steam-appids.json`) so it survives restarts and accumulates as users browse. Same pattern as existing `src/cache/prices.json`.

Population paths:
1. **Lazy** (primary): when a card's title lookup fails, fire one RAWG `/games/:id` call → extract steamAppId → save mapping. Future requests use it.
2. **Eager** (secondary): when `getGameByIdService` runs (game page visit), save the resolved steamAppId. Future card requests benefit.

Schema:
```ts
type ResolverCache = Record<number, { appid: string | null; resolvedAt: number }>
```
`null` is cached too (with shorter TTL ~24h) so we don't re-fire RAWG for games confirmed not on Steam.

## Rate limiting with bottleneck

Replace the manual CheapShark semaphore (`acquireCs`/`releaseCs`/`csInflight`/`csQueue` — about 40 lines) with a Bottleneck instance:

```ts
import Bottleneck from 'bottleneck'

const csLimiter = new Bottleneck({
  maxConcurrent: 2,
  minTime: 200,            // ≤ 5 req/sec
  reservoir: 60,           // burst capacity
  reservoirRefreshAmount: 60,
  reservoirRefreshInterval: 60 * 1000,
})

// Usage:
const result = await csLimiter.schedule(() => axios.get(...))
```

Delete the old semaphore code (`acquireCs`, `releaseCs`, `csInflight`, `csQueue`, related comments).

## CheapShark steamAppId lookup

When we have a verified steamAppId, use CheapShark's `/deals?steamAppID=XYZ` endpoint instead of `/games?title=`. This makes CheapShark's match exact instead of fuzzy.

Fallback to title search when no steamAppId is known.

New function shape:
```ts
async function checkCheapSharkPriceByAppId(steamAppId: string): Promise<CardPrice | null>
async function checkCheapSharkPriceByTitle(name: string): Promise<CardPrice | null>
```

## Implementation order

1. `npm install bottleneck` in repo root (backend).
2. Add `CacheEntry` shape with `source` field. Migrate existing cache reads/writes to include `source`.
3. Create file-backed `rawgIdToSteamAppId` resolver cache (`src/cache/rawg-steam-appids.json` + load/save helpers debounced 30 s, same pattern as `priceCache`).
4. Add `resolveSteamAppId(game)` helper that runs the cascade: override → caller-passed → resolver-cache → RAWG `/games/:id` (with persistent cache write on success).
5. Add `checkCheapSharkPriceByAppId` using `/deals?steamAppID=`. Keep title version as fallback.
6. Replace manual CheapShark semaphore with `bottleneck`. Delete the old code.
7. Refactor `getCardPricesService`:
   - Classify each game as `serve_cache_only` / `serve_and_refresh` / `must_fetch_blocking`
   - Serve cache for "serve_*" entries
   - Block on "must_fetch" using new parallel pipeline (with steamAppId resolved via cascade)
   - Background-fire "serve_and_refresh" pipeline (don't await)
8. Hook `getGameByIdService` to write into the resolver cache after extracting steamAppId.
9. Tighten `null`-cache TTL from 30 min to 5 min. Verified-confident prices stay at 30 min.
10. Typecheck (`npx tsc --noEmit` in both root and `client/`).
11. Manual smoke test: load home page, check that previously-broken games (Tomb Raider, Hitman, etc.) show prices.

## Senior review checklist (apply before declaring done)

From `game-price-orchestrator.md`:

- [ ] ITAD and CheapShark fire in **true parallel** (`Promise.all`), no accidental await chain
- [ ] Cache bypasses re-check stale nulls when new info appears (provenance-aware skip rules)
- [ ] Background refresh doesn't block the response — fire-and-forget via `void` or `.catch`
- [ ] `isFree` propagates even when only ONE source reports it (Free wins)
- [ ] Error isolation: ITAD 429 still lets CheapShark succeed, and vice versa
- [ ] Card display handles all four states (`···` / `Unknown` / `Free` / `$X.XX`)
- [ ] Logs every match and every miss with exact strings — no silent catches
- [ ] CheapShark calls go through `bottleneck.schedule()`, never raw axios
- [ ] Resolver cache survives nodemon restart (file load on module init)
- [ ] `KNOWN_STEAM_APPIDS` override still takes precedence over RAWG/resolver-cache (verified data > discovered data)

## Anti-patterns to NOT introduce

- ❌ Don't make the response wait for background refreshes
- ❌ Don't disable CheapShark when steamAppId is known (lose Free detection on Free-on-Epic games)
- ❌ Don't use the resolver cache as the source of truth for steamAppId — `KNOWN_STEAM_APPIDS` still wins
- ❌ Don't add `cache-manager`, `swr`, or any other npm cache library — small enough to keep inline
- ❌ Don't change `getCardPricesService` callers — keep input/output shape stable
- ❌ Don't remove `KNOWN_FREE_TITLES` — it short-circuits known free games with zero API cost
- ❌ Don't cache `null` in the resolver cache forever — 24 h TTL so we retry games eventually added to Steam

## Done means

- All games in `KNOWN_STEAM_APPIDS` show the correct price on the home card after a fresh server start (no cache)
- A game that's on the game page with a price shows the SAME price on the home card after one visit (resolver cache populated by detail page)
- API call volume per page render does not exceed ~15 (down from theoretical max of ~100 with naive Option B)
- `bottleneck` is in use; manual semaphore is gone
- Backend `tsc --noEmit` passes
