---
name: dislow-game-card
description: |
  Design and implementation reference for every game card in the DisLow app.
  Use this skill whenever building, editing, or reviewing any game card component —
  GameCard, PopularTile, BigCard, MedCard, SmallCard, or FavCard. Also trigger on:
  "how should the card look", "card price display", "card layout", "add discount badge",
  "card design", "update game card", "fix card", or any question about what a game card
  should or should not show. This skill is the single source of truth for card UI.
---

# DisLow Game Card — Design & Implementation Reference

Every game card in DisLow shares the same visual language regardless of variant.
When in doubt, defer to the rules in this file over any older code you may find.

---

## Visual Structure

```
┌─────────────────────────────┐
│                             │
│      Cover Image            │  ← full-bleed, object-cover, absolute inset-0
│      (full bleed)           │
│                             │
│                          ★  │  ← StarButton, top-right corner
│                             │
├─ ─ ─ gradient overlay ─ ─ ─┤
│  Game Title        [score]  │  ← font-bold white | rating chip
│  Genre · Genre              │  ← muted, 12px
│  [PC] [PS] [Xbox]  $14.99  │  ← platform pills | price
└─────────────────────────────┘
```

The info area is an **overlay on top of the cover image** — never a separate strip below it.
A dark gradient (`linear-gradient(to top, rgba(0,0,0,0.75) … transparent)`) sits between
the image and the overlay so text stays readable even on bright covers.

---

## Dimensions & Shape

| Property | Value |
|---|---|
| Default size | 280 × 380 px |
| Card corner radius | `15px` |
| Overlay corner radius | `0 0 15px 15px` (bottom only, matches card) |
| Hover effect | lift `-4px` on Y, `0.2s easeOut` |

---

## Info Overlay (frosted glass)

```css
background:      rgba(28, 30, 42, 0.75);
backdrop-filter: blur(8px);
-webkit-backdrop-filter: blur(8px);
padding:         12px;
position:        absolute;
bottom: 0; left: 0; right: 0;
```

### Row 1 — Title + Rating chip
- **Title**: `15px`, `font-bold`, white, `truncate` (single line)
- **Rating chip** (right-aligned, flex-shrink-0):
  - Source priority: Metacritic score first → RAWG `rating × 20` fallback → hide if no data
  - Color thresholds: green `#5BDE8A` ≥75 · yellow `#F5C84B` 40–74 · red `#E26A6A` <40
  - Background: same color at `22` hex alpha (≈13% opacity)
  - `borderRadius: 5`, `letterSpacing: -0.01em`
  - Tooltip: `"Metacritic score"` or `"User score"` depending on source

### Row 2 — Genre
- `12px`, `rgba(255,255,255,0.45)`, max 2 genres joined by ` · `, `truncate`

### Row 3 — Platform pills + Price

**Platform pills** (left side):
- `11px`, `font-semibold`
- Background: `rgba(255,255,255,0.09)` · Text: `rgba(255,255,255,0.60)`
- `borderRadius: 5`
- Color is **always muted** — never purple, green, or blue

**Platform label mapping:**
```
PlayStation / PS5 / PS4      → "PS"
Xbox                         → "Xbox"
Nintendo / Switch            → "Switch"
PC / Windows / Linux / Mac   → "PC"
iOS / iPhone / iPad          → "iOS"
Android                      → "Android"
```
Show max 3 platforms. Deduplicate before rendering.

**Price** (right-aligned):

| State | Display | Color | Size |
|---|---|---|---|
| On sale (`cut > 0`) | `-50%` badge + `$9.99` | badge `#44d62c` · price `#5BDE8A` | 11px badge · 14px price |
| Full price | `$29.99` | `#5BDE8A` green | `14px` |
| Free (`isFree: true`) | `Free` | `#48BCF9` cyan | `14px` |
| Not in any store (`null`) | `Unknown` | `rgba(255,255,255,0.30)` | `9–11px` |

**Discount badge style:**
```css
background:   rgba(68, 214, 44, 0.15);
color:        #44d62c;
borderRadius: 4;
font-bold;    11px;
padding:      2px 6px;
```

The price area is **always rendered** — even when null, show "Unknown" dimmed.
Never hide the price row entirely.

---

## Star Button (top-right)

```
position: absolute, top: 10, right: 10
size:     28 × 28 px
radius:   8px
```

| State | Background | Border | Icon |
|---|---|---|---|
| Default | `rgba(0,0,0,0.35)` | `rgba(255,255,255,0.08)` | outline, `rgba(255,255,255,0.6)` |
| Favorited | `rgba(72,188,249,0.18)` | `rgba(72,188,249,0.4)` | filled `#48BCF9` |

- `whileHover: scale 1.2` · `whileTap: scale 0.85`
- Always calls `e.stopPropagation()` before toggling

---

## Color Semantic Rules (CRITICAL — never break these)

| Color | Meaning | Use on cards |
|---|---|---|
| `#AE3BD6` purple | In-game EVENTS | Event pill on left edge only |
| `#44d62c` / `#5BDE8A` green | Discounts & prices | Discount badge, price text |
| `#48BCF9` cyan/blue | Free games, favorites | "Free" label, favorited star |
| Muted `rgba(255,255,255,0.60)` | Platform icons | Always — no brand colors on platforms |

---

## What Must NOT Appear on Cards

- ❌ **Rank badge** — the purple side-tab number is removed from all card variants
- ❌ **Colored platform icons** — always muted, never inherit brand colors
- ❌ `"Unknown"` in white or full opacity — must be visually dimmed
- ❌ Green dot indicator — replaced entirely by price text
- ❌ Info strip below the image — overlay must sit ON TOP of the cover

---

## TypeScript Props

```typescript
// client/types/game.ts
interface CardPrice {
  price:   number   // current sale price (USD)
  regular: number   // regular (non-sale) price
  cut:     number   // 0–100 discount percentage
  isFree:  boolean  // true when price === 0
}

// GameCard props
interface GameCardProps {
  game:              Game
  rank?:             number        // accepted but NOT rendered as a badge
  price?:            CardPrice | null
  isFavorited?:      boolean
  onToggleFavorite?: (e: React.MouseEvent) => void
}
```

Prices are fetched via `getCardPrices()` in `client/lib/api/games.ts`
which calls `POST /games/card-prices` on the backend.

---

## Card Variants

All variants share the overlay style, price logic, star button, and color rules above.
Only dimensions and tilt/blur effects differ.

| Variant | File | Size | Notes |
|---|---|---|---|
| `GameCard` | `components/game/GameCard.tsx` | 280 × 380 | Default. Search, Free to Play, Hidden Gems, Trended, For You |
| `PopularTile` | `components/game/PopularCarousel.tsx` | dynamic × 440 | 3D `rotateY` tilt; off-center cards blur + dim |
| `BigCard` | `components/game/NewBentoGrid.tsx` | spans 2 rows, 420 tall | Left column of New bento |
| `MedCard` | `components/game/NewBentoGrid.tsx` | 2×2 grid | Right side of New bento |
| `SmallCard` | `components/game/NewBentoGrid.tsx` | smallest | Bottom row of New bento |
| `FavCard` | `components/game/FavoritesShelf.tsx` | 380 × 380 | Uses `deriveRating()` chip, not raw `game.rating` |

---

## Key Shared Utilities (GameCard.tsx exports)

```typescript
StarButton      // favorite toggle button — import and reuse, don't rebuild
deriveRating()  // Metacritic-first rating → { label, pct, source }
ratingColor()   // pct → "#5BDE8A" | "#F5C84B" | "#E26A6A"
formatPrice()   // legacy string formatter — prefer CardPrice object directly
RankBadge       // exported but intentionally NOT used on any card variant
```
