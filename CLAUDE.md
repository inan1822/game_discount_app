# DisLow — Design System Rules for Claude Code

## Project Overview
Mobile-first game deal finder app. Dark gaming aesthetic. Built with Next.js + Tailwind + shadcn/ui.

---

## Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui (functional) + 21st.dev (animated/visual)
- **Animations:** Framer Motion
- **HTTP:** Axios
- **State:** React Context API (AuthContext, WishlistContext)
- **Notifications:** react-toastify

---

## Project Structure

```
gaming-app/
├── client/                  ← Next.js frontend (ALL frontend work here)
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (main)/
│   │   │   ├── page.tsx            ← Home / browse
│   │   │   ├── game/[id]/page.tsx  ← Game detail
│   │   │   ├── wishlist/page.tsx
│   │   │   └── search/page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/              ← shadcn/ui components
│   │   ├── game/            ← GameCard, GameGrid, PriceTable
│   │   ├── layout/          ← BottomNav, Header, MobileLayout
│   │   └── shared/          ← PlatformBadge, DiscountBadge, etc.
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── WishlistContext.tsx
│   ├── lib/
│   │   ├── api/
│   │   │   ├── axios.ts         ← Axios instance + interceptors
│   │   │   ├── cheapshark.ts    ← CheapShark direct calls (client-side)
│   │   │   └── games.ts         ← Our backend API calls
│   │   └── utils.ts
│   └── types/
│       ├── game.ts
│       └── user.ts
└── src/                     ← Express backend
    └── featchers/
        ├── auth/
        ├── games/           ← RAWG proxy + wishlist
        └── wishlist/
```

---

## Design Tokens (from Figma — NEVER hardcode, always use these)

### Colors
```css
/* globals.css — CSS variables */
:root {
  /* Backgrounds */
  --bg-primary:     #12131a;   /* main app background */
  --bg-card:        #1c1e2a;   /* card backgrounds */
  --bg-surface:     #2a2d32;   /* elevated surfaces */
  --bg-overlay:     rgba(0,0,0,0.6);

  /* Brand / Accents */
  --color-purple:   #AE3BD6;   /* primary brand purple (Figma: "Event") */
  --color-purple-light: #999FFA; /* lighter purple (Figma: "blue light") */
  --color-blue:     #6475D1;   /* blue-purple (Figma: "blue N") */
  --color-cyan:     #2ab7e6;   /* info / platform icons */
  --color-green:    #44d62c;   /* discounts / deals — ALWAYS use for price drops */

  /* Text */
  --text-primary:   #FFFFFF;
  --text-secondary: #b3bade;
  --text-muted:     #9fa0a1;

  /* Borders */
  --border-subtle:  rgba(188,188,201,0.7);

  /* Shadows */
  --shadow-card:    6px 4px 49px 0px rgba(0,0,0,0.7);
  --shadow-purple:  3px 7px 20px 0px #A521D3B0;
  --shadow-blue:    3px 7px 20px 0px #6475D1B0;
}
```

### Tailwind Token Mapping (`tailwind.config.ts`)
```ts
colors: {
  bg: {
    primary:  '#12131a',
    card:     '#1c1e2a',
    surface:  '#2a2d32',
  },
  brand: {
    purple:   '#AE3BD6',
    light:    '#999FFA',
    blue:     '#6475D1',
    cyan:     '#2ab7e6',
    green:    '#44d62c',
  },
  text: {
    primary:  '#FFFFFF',
    secondary:'#b3bade',
    muted:    '#9fa0a1',
  }
}
```

---

## Typography (from Figma)

**Primary Font:** `CoconPro` — IMPORTANT: This is a commercial font.
- Load via `@font-face` if user has a license, otherwise use `'Nunito'` from Google Fonts as fallback (similar rounded style)

| Token | Family | Size | Weight | Use |
|---|---|---|---|---|
| `heading-1` | CoconPro Regular | 64px | 400 | Hero titles |
| `heading-2` | CoconPro Regular | 48px | 400 | Page titles |
| `heading-3` | CoconPro Regular | 32px | 400 | Section titles |
| `body-large` | CoconPro Light | 30px | 350 | Paragraph text |
| `body` | CoconPro Regular | 28px | 400 | General text |
| `body-small` | CoconPro Light | 22px | 350 | Secondary text |
| `caption` | CoconPro Light | 16px | 350 | Labels, captions |
| `bold` | CoconPro Bold | 32px | 700 | Emphasis, CTAs |

---

## Component Rules

### IMPORTANT: Always do this before implementing a Figma component
1. Call `get_design_context` on the specific node
2. Call `get_screenshot` for visual reference
3. Map Figma colors to CSS variables above — NEVER hardcode hex values
4. Use existing components from `components/` before creating new ones

### Mobile-First Rule
- IMPORTANT: All layouts are designed for 390px width (mobile)
- Use `max-w-[390px] mx-auto` on the root layout wrapper
- Desktop = same centered mobile view, like a phone frame
- Never build desktop-first layouts

### Game Card Component (`components/game/GameCard.tsx`)
```tsx
// Structure:
// - Rounded corners: rounded-[20px]
// - Dark card bg: bg-bg-card
// - Game cover image (from RAWG): aspect-ratio 3/4
// - Discount badge: bg-brand-green text-black font-bold (top-left corner)
// - Platform icons row (bottom)
// - Title + genre below image
// - Hover: use 21st.dev Tilt Card effect
```

### Price / Discount Badge
```tsx
// Discount % → always bg-brand-green (#44d62c) text-black
// Price → text-white font-bold
// Original price → text-text-muted line-through
```

### Platform Icons
- Steam → use official Steam icon (SVG)
- Epic → use Epic Games icon (SVG)
- GOG → use GOG icon (SVG)
- Xbox → use Xbox icon (SVG)
- PlayStation → use PlayStation icon (SVG)
- IMPORTANT: Store as SVGs in `public/icons/platforms/`
- NEVER use emoji for platform indicators

### Bottom Navigation (`components/layout/BottomNav.tsx`)
```
4 tabs: Home | Favourites | Notifications | Search
Active tab: color brand-purple, inactive: text-muted
Position: fixed bottom-0, backdrop-blur-md bg-bg-primary/80
```

---

## API Architecture

```
Frontend (Next.js client)
  ├── CheapShark API → called DIRECTLY from browser (no proxy)
  │   Header: 'User-Agent': 'DisLow/1.0 (bananagamer182@gmail.com)'
  │   MUST use CheapShark redirect links when sending users to deals
  │
  ├── Our Backend (/api/v1/*)
  │   ├── /auth/* → login, register, me
  │   ├── /games/search?q= → proxies RAWG (key protected server-side)
  │   ├── /games/:id → RAWG game detail
  │   └── /wishlist → CRUD
  │
  └── ITAD API → called from backend (key protected)
      Client ID: 22ea300dd1fdf24d
```

### Axios Instance (`lib/api/axios.ts`)
```ts
// Base URL: process.env.NEXT_PUBLIC_API_URL
// Interceptor: attach JWT from localStorage to every request
// Interceptor: on 401, clear auth and redirect to /login
```

---

## Effects & Animations

### Blur Effect (Figma: "blur")
```css
backdrop-filter: blur(14px);
/* Use for: nav bar, card overlays, modals */
```

### Glow Effects
```css
/* Purple glow — use on featured/highlighted cards */
box-shadow: 3px 7px 20px 0px #A521D3B0;

/* Blue glow — use on stats/info elements */
box-shadow: 3px 7px 20px 0px #6475D1B0;
```

### Large Background Blurs (from Figma)
- Decorative colored blobs: `blur-[315px]` and `blur-[352px]`
- Colors: brand-purple and brand-blue at low opacity (~0.3)
- Use as absolute positioned `<div>` elements behind content for atmosphere

---

## Figma File Reference
- File key: `WPF3cimH7v0S2mYT8JjXDl`
- Design rules page node: `3406:8781`
- Login screen: `867:10994`
- Home screen: `867:10248`

---

## Rules Summary (NEVER break these)
1. NEVER hardcode colors — use CSS variables or Tailwind tokens
2. NEVER build desktop-first — mobile 390px always
3. NEVER use emoji for platform icons — SVG only
4. ALWAYS use CheapShark redirect links for store links
5. ALWAYS attach User-Agent header on CheapShark calls
6. NEVER call RAWG directly from frontend — proxy via backend
7. ALWAYS use `CoconPro` or `Nunito` as font family
8. discount % badge = ALWAYS brand-green (#44d62c) on black text
