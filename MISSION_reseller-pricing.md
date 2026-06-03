# Mission: Automatic reseller pricing for DisLow

**Goal:** Make gray-market key-reseller prices (Driffle, Kinguin, G2A, Eneba, CDKeys…)
appear **automatically** in a game's "Where to buy / Discounts" tab — instead of being
added one manual link at a time — with affiliate-tagged links where possible.

> Paste this whole file into a fresh session to start. It is self-contained.

---

## 0. Background (read first — needed for a cold start)

- **DisLow** = game deal-finder + key store. Monorepo:
  - Backend: Express + TS at repo root (`server.ts` → `src/`). Deals logic lives in
    `src/featchers/games/games.service.ts` (note: `featchers` is the real spelling).
  - Frontend: Next.js in `client/`. CRM admin in `crm/`.
- **The deals feed** for a game is built by `getGameDealsService(title, steamAppId?, releaseYear?)`
  in `games.service.ts`. Sources, in order:
  1. **ITAD** (`/games/prices/v3`) via Steam appid → `fetchItadDeals()` (primary).
  2. **CheapShark gap-fill** — `backfillFromCheapShark()` unions stores ITAD missed
     (exact `?steamAppID=`, then strict title match via `/games?id=`).
  3. **Path B** — CheapShark title fallback when ITAD has nothing.
- **Manual links** (the current way resellers show up): `GameManualLink` model
  (`src/featchers/games/GameManualLink.model.ts`), admin-managed under
  `/api/v1/admin/game-links`. An admin pastes a store URL into the AI assistant
  (`src/featchers/admin/llm.controller.ts`), which fetches it (cheerio) and pre-fills a link.

## 1. Why this mission exists (verified findings — don't re-discover)

- **ITAD and CheapShark do NOT track gray-market resellers.** Confirmed:
  - CheapShark's full store list (35) has **no** Driffle/Kinguin/G2A/Eneba/CDKeys.
  - ITAD returns only official stores (e.g. **GTA IV → Steam only**; Vice City → 0/1).
- So today, resellers can ONLY appear as **manual links** — they never auto-populate.
- **Reseller APIs are seller/dropshipper-oriented, not price feeds:**
  - **Kinguin** has an eCommerce/Integration API (catalog+prices) but you must create+verify
    a "store" and fund a EUR wallet — built for dropshippers.
  - **Driffle** API is **merchants only**.
  - **G2A / Eneba** data APIs are for sellers; their affiliate programs give **links, not data**.
- **allkeyshop** is the ONLY aggregator with a price-comparison API/widget that already
  covers all the resellers — but access is a **negotiated partnership** (contact them),
  not a self-serve key.

## 2. Chosen approach

- **Primary:** integrate **allkeyshop's partner API** as a single aggregator source →
  one integration auto-fills all resellers per game.
- **Quick interim win:** join the free affiliate programs and **tag the existing manual
  links** so the links you already show start earning commission (still manual).
- **Fallback if allkeyshop access is denied:** per-reseller scrape — but only for
  scrapeable sites (Driffle is; G2A/Kinguin are bot-protected) — using the existing
  cheerio extractor + strict matching + **admin one-click approval** (semi-automatic),
  to avoid wrong-product matches.

---

## STEPS

### Phase 0 — External prerequisites (SLOW — start these now, they gate everything)
- [ ] **Email allkeyshop** (contact@allkeyshop.com) for partner/API access + terms. ⛔ BLOCKS Phase 2.
- [ ] Join affiliate programs (free, fast) and collect affiliate IDs:
  - [ ] G2A **Goldmine** · [ ] **Kinguin Affiliate** · [ ] **Eneba** · [ ] **Driffle (via Awin)**
- [ ] Product decision: confirm it's OK to display gray-market resellers (region/refund risk);
      write a one-line "third-party seller" disclaimer for the UI.

### Phase 1 — Affiliate-tag existing manual links (no API needed; do once IDs are in hand)
- [ ] Add affiliate-tag env vars (e.g. `G2A_AFF_ID`, `KINGUIN_AFF_ID`, `ENEBA_AFF_ID`, `DRIFFLE_AWIN_ID`).
- [ ] In the link builder for `GameManualLink` (or at render time), append the affiliate
      params for matching reseller domains. Keep raw URL if no tag configured.
- [ ] Verify: the Kinguin/G2A links already shown now carry affiliate tags.
- [ ] **Acceptance:** clicking a reseller link lands on the product with the affiliate ref attached.

### Phase 2 — allkeyshop aggregator integration (after Phase 0 access granted)
- [ ] `ALLKEYSHOP_API_KEY` env + startup validation (see `server.ts` for the pattern).
- [ ] New `src/featchers/games/resellers.service.ts`:
  - [ ] `getResellerDeals({ rawgId?, steamAppId?, title })` → calls allkeyshop API.
  - [ ] Map to a `ResellerDeal[]` shape: `{ store, price, currency, region, url(affiliate), edition }`.
  - [ ] **Strict matching** so a wrong key isn't shown (reuse `normTitle` / exact-match
        discipline from `games.service.ts`; reseller titles are noisy — region/edition junk).
  - [ ] **Cache** results (file-backed Map + TTL ~1–3h, like `priceCache`/`dealsCache`) and
        **refresh in the background** — never block the request path.
  - [ ] Honor allkeyshop ToS: keep affiliate tags, attribute the source, don't strip links.
- [ ] Rate-limit via a Bottleneck limiter (see `csLimiter`).

### Phase 3 — Surface in API + UI
- [ ] Return reseller deals as a **separate group** (do NOT merge into the official
      ITAD/CheapShark store list). Either extend the deals response with `resellers: ResellerDeal[]`
      or add a new endpoint `GET /api/v1/games/reseller-deals`.
- [ ] Frontend (`client/`): render a **"Key resellers (third-party)"** section under the
      official stores, with region + price + the disclaimer. Manual links remain as override.

### Phase 4 — Test & ship
- [ ] Local probe script (tsx, like the ones used during discovery): import the service,
      run GTA IV / Hogwarts Legacy / Cyberpunk, print reseller results, then delete the script.
      Confirm prices appear and there are **no wrong-game matches**.
- [ ] `npx tsc --noEmit` clean; `npm test` green.
- [ ] Commit on `feat/reseller-pricing`.

---

## Code anchors (reuse, don't reinvent)
| Need | Where |
|---|---|
| Caching (Map + TTL + file-backed) | `priceCache` / `dealsCache` / `loadPriceCacheFromDisk` in `games.service.ts` |
| Strict title matching | `normTitle`, `isEditionVariant`, `acronymMatch` in `games.service.ts` |
| Fetch URL + extract price (cheerio + JSON-LD) | `executeTool('fetch_url_content')` in `admin/llm.controller.ts` |
| Domain allowlist (Driffle/Kinguin/etc. already listed) | `SAFE_DOMAINS` in `admin/llm.controller.ts` |
| Rate limiting | `csLimiter` (Bottleneck) in `games.service.ts` |
| Manual link storage/admin | `GameManualLink.model.ts`, `games/manualLinks.controller.ts`, CRM `/game-links` |

## Acceptance criteria (definition of done)
- A game like **GTA IV** auto-shows Driffle/Kinguin/etc. prices (from allkeyshop), in a
  clearly-labeled **third-party resellers** group, with **affiliate-tagged** links,
  **no wrong-game matches**, cached + background-refreshed.
- **No regression** to the official ITAD/CheapShark deals.

## Risks / gotchas
- **Matching** is the #1 risk — gray-market titles include region/edition/platform noise.
- **Price semantics:** resellers show "from $X" (cheapest seller) — label it honestly.
- **Performance:** never fetch resellers synchronously on page load — cache + background job.
- **ToS/affiliate:** prefer official APIs; some sites forbid scraping; never strip affiliate tags.

---

## ⚠️ Current repo state / loose ends to settle FIRST
These exist from the prior deals-coverage work and should be resolved before/around this mission:
1. **Uncommitted changes in `src/featchers/games/games.service.ts`** (ITAD 429 logging,
   CheapShark gap-fill, and the **Path B `/deals?gameID=` → `/games?id=` bug fix**) are sitting
   on the `security/cors-token-ban-webhook` branch. Move them to `feat/deals-coverage` and commit.
2. **Dedup pass still TODO:** long AAA store lists (e.g. Hogwarts Legacy ≈22) contain duplicates
   (`Fanatical` ×2, `Gamesplanet US/UK/FR/DE` as separate rows). Add a final canonical-dedup pass
   over the merged deals (collapse same-store + region variants) before shipping the gap-fill.
3. Optional: icon-map fix so ITAD-sourced Epic/Microsoft rows get store icons.
