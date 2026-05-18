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

## Color Semantic System (CRITICAL — every color has a specific meaning)

### PURPLE `#AE3BD6` = IN-GAME EVENTS
- Used for anything related to in-game events (Double XP, seasonal modes, limited-time content)
- Purple dot on game card → this game has active events
- Radial gradient background on event-related pages/sections
- Glow effect on event cards
- NEVER use purple for discounts/prices

### GREEN `#44d62c` = DISCOUNTS / LOWEST PRICE
- Used for anything related to price drops and in-game discounts
- Green dot on game card → the lowest current price for this game
- Radial gradient background on discount-related pages/sections
- Discount % badge is ALWAYS green on black text
- NEVER use green for events

### BLUE `#6475D1` = MAIN APP THEME
- Background atmospheric effects (the big blur blobs behind content)
- Button hover state: white → blue transition
- Icons (nav icons, action icons)
- General UI accent when neither event nor discount context applies
- The overall "app feel" color

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

  /* Brand / Accents — each has a SEMANTIC meaning, see above */
  --color-purple:   #AE3BD6;   /* EVENTS only */
  --color-purple-light: #999FFA; /* lighter purple */
  --color-blue:     #6475D1;   /* app theme, icons, hover */
  --color-cyan:     #2ab7e6;   /* info elements */
  --color-green:    #44d62c;   /* DISCOUNTS / PRICES only */

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

### Header Icons (every main page)
```
LEFT side of header:  Friends icon → opens friends list (following/followers/requests/add)
RIGHT side of header: Profile icon → opens user profile
  - Profile shows: games you follow, following count, followers count, shared games with friends
```

### Game Card Component (`components/game/GameCard.tsx`)
```tsx
// UPDATED DESIGN (v2 — confirmed from Figma):
// Structure:
// - Rounded corners: rounded-[20px]
// - Cover image fills the ENTIRE card (full bleed, no separate info strip below)
// - Info overlay sits at the BOTTOM of the cover image:
//     background: rgba(28, 30, 42, 0.70)  ← #1C1E2A at 70% opacity
//     backdrop-filter: blur(8px)
//     Contains: game name (small, bold) + genre tag + console icons + lowest price text
// - Purple event indicator on the LEFT SIDE EDGE of the card:
//     A pill/badge stuck to the left side, showing event count number
//     Color: #AE3BD6 — ONLY if game has active events
//     NEVER on the top-left corner anymore — it's on the side
// - NO green dot — price is shown as text inside the info overlay instead
// - Hover: use 21st.dev Tilt Card effect
```

### Game Card Indicator — Rules (UPDATED)
```
Purple pill/badge = IN-GAME EVENT exists → color #AE3BD6
  - Position: LEFT SIDE EDGE of card (vertically centered or near top)
  - Shows the event COUNT number inside the pill
  - ONLY appears if game has active events

GREEN DOT IS REMOVED — do NOT add a green dot
  - Lowest price is shown as plain text inside the card info overlay
  - Format: "$XX.XX" in white text within the frosted glass overlay

Neither event pill nor price dot → just show price text in overlay
```

### Game Card Info Overlay (NEW — replaces bottom strip)
```tsx
// Frosted glass overlay at bottom of card cover image
// background: rgba(28, 30, 42, 0.70)
// backdrop-filter: blur(8px)
// border-radius: 0 0 20px 20px (matches card corner radius at bottom)
// Contents (left to right):
//   - Game title (small, font-bold, white)
//   - Genre/style tag (text-muted, smaller)
//   - Console icons SVG row (same muted color as text)
//   - Lowest price (white, right-aligned) — e.g. "$12.99"
```

### Price Display Rule (UPDATED)
```
Price is shown as plain text inside the card info overlay — NOT as a colored badge.
Format: "$XX.XX" — white text, right-aligned in the overlay.
Green color is NOT used on the card for price.
Green (#44d62c) still used on: discount badges on detail pages, discount tab themes.
```

### SVG Icons — Project Icon Set
```
Location: C:\FULLSTACK\lessons\AI Figma\gaming-app\svg gaming app\

Files:
  home.svg                   → Home nav item
  favoties 1=Default.svg     → Favorites (default/inactive state)
  favoties 1=Variant2.svg    → Favorites (active/filled state)
  notifications.svg          → Notifications nav item
  search.svg                 → Search nav item
  freinds.svg                → Friends nav item
  logo.svg                   → DisLow logo mark
```
- IMPORTANT: Always use these SVGs for navigation icons — NEVER use icon libraries or emoji
- Copy them to `public/icons/` in the frontend project
- Reference as `<img src="/icons/home.svg" />` or inline SVG
- Color them via CSS `fill` or `color` (ensure SVGs use `currentColor`)

### Platform / Console Icons
- IMPORTANT: Console icons are the SAME COLOR as the surrounding text (no special brand colors)
- They indicate availability: PC, PS5, Xbox, Switch, etc.
- Store as SVGs in `public/icons/platforms/`
- NEVER use emoji for platform indicators
- Size: 14–16px inline with text

### Game Style Tags (Genre)
- Shows game type: FPS, RPG, Adventure, Sports, etc.
- Same muted text color as console icons
- Displayed below console icons on the card

### Home Page Header (UPDATED — Floating Glassmorphism Bar)
```
The home page header is a COMPACT FLOATING BAR, not a full-width solid bar.

Style:
  - border-radius: 12px
  - opacity: 60% on the background
  - backdrop-filter: blur(8px)
  - Floats over the content (position: sticky/fixed, not edge-to-edge)
  - Does NOT touch the screen edges — has horizontal margin

Contents (left → right):
  - Filter icon (left)
  - Scrollable tabs: Popular | New | Trended | Favorites | Notifications
  - Search icon (right) — tapping it EXPANDS into a full search input
  - Profile avatar icon (rightmost)

IMPORTANT: Tabs live INSIDE the floating header bar — not in a separate row below it.
IMPORTANT: Search is an icon that expands — it is NOT always-visible text input.
```

### Back Button (ALL detail/sub pages)
```
Style: glassmorphism — matches the floating header feel
  - background: rgba(28, 30, 42, 0.60)   ← #1c1e2a at 60% opacity
  - backdrop-filter: blur(6px)
  - border-radius: 10px
  - Label: "← Back"  color: text-secondary (#b3bade)
  - Position: 20px from sidebar right edge, 20px from top of content area

NEVER use a solid opaque background for the back button.
NEVER skip the blur — it must always be blur(6px).
```

### Home Page Tabs — Meaning
```
Favorites      → games the user has saved/followed (their personal list)
For You        → app recommendations based on the user's Favorites list
Popular        → globally popular games right now
New            → recently released games
Trended        → trending/viral games
Notifications  → also accessible as a tab in the home header
```

### Mobile Side Drawer Navigation (`components/layout/SideDrawer.tsx`)
```
Opened by: hamburger/menu icon or swipe gesture
Closes by: tap outside or swipe back

Background: rgba(30, 38, 51, 0.40) — #1E2633 at 40% opacity
backdrop-filter: blur(8px)

Items (top to bottom):
  1. DisLow Logo (at top of drawer)
  2. Home       → icon + label
  3. Favorites  → icon + label
  4. Notifications → icon + label
  5. Search     → icon + label
  6. Friends    → icon + label
  7. Profile    → icon + label
  8. Log out    → icon + label, RED color (destructive)

Each item has a REAL icon (SVG), not a dot or placeholder.
Active item: highlighted with purple (#AE3BD6) accent.
Log out is ALWAYS red — it is a destructive action.
```

### Bottom Navigation (`components/layout/BottomNav.tsx`)
```
MOBILE ONLY — 4 tabs:
  Home          → main screen (shows all tabs: Favorites, For You, Popular, New, Trended)
  Favorites     → ONLY the games this user has saved/hearted
  Notifications → ALL events + discounts from games in user's Favorites list
                  (aggregated feed — user sees event/discount name right on this page)
  Search        → search for any game

Active tab: color brand-purple (#AE3BD6), inactive: text-muted
Position: fixed bottom-0, backdrop-blur-md bg-bg-primary/80
```

### Notifications Page
```
Tabs: All | Events | Discounts
- Events tab (purple theme): in-game events from user's favorited games
- Discounts tab (green theme): price drops / in-game discounts from user's favorited games
- Each item shows: game cover, game name, event/discount description, date, days left
- Background radial gradient: purple for Events tab, green for Discounts tab
```

### Desktop Sidebar — Exact Structure (UPDATED v3)
```
Style: GLASSMORPHISM — NOT solid
  background: rgba(30, 38, 51, 0.40)  ← #1E2633 at 40% opacity
  backdrop-filter: blur(8px)
  width: 240px, full page height

Items (top to bottom):
  - DisLow logo (small circle icon + "DisLow" wordmark)
  - Divider line
  - "MENU" label (10px, muted gray)
      Home          → house icon
      Favorites     → star icon   ← ADDED in new design
      Notifications → bell icon
      Search        → magnifier icon
  - Divider line
  - "SOCIAL" label (10px, muted gray)
      Friends       → people icon
      Profile       → avatar circle icon
  - Log out  ← ALWAYS at the bottom (y ≈ H - 60), ALWAYS red (#ef4444), icon bg #3d1515

Every item has a dedicated SVG icon — NEVER use placeholder dots or text-only.
Active item: colored bg highlight at ~20% opacity + colored text.
Log out is pinned to bottom, NEVER inline with nav items.
```

### Game Detail Page — Full Structure
```
When user clicks any game → opens the game detail page

DESKTOP LAYOUT (two-column):
  Left column  (~430–460px): hero image, game info, friends, store button, about
  Right column (remaining): Events / Discounts tab panel

SPACING:
  - 20px gap from sidebar right edge to left column
  - 24px gap between left column and right column
  - 20px right edge padding

Left column top to bottom:
  1. Hero image (full-width of left col, ~268–280px tall, rounded 16px)
     - Favorite star (★) button top-right — circle, 50% black bg, purple star
     - Share (↗) button next to it — circle, 50% black bg, muted arrow
  2. Game title (bold, 26px white)
  3. Genre tags (small pill frames, muted bg)
  4. Platform row: PC · PS5 · Xbox (muted text, dots as separators)
  5. Divider line
  6. "Friends following" label + overlapping avatar circles (5 avatars, 30px overlap)
     + "+ X friends" muted text
  7. "Visit Game Store →" button — full width, blue (#6475D1) with glow
  8. "About" label + description text

RIGHT PANEL — TWO TABS: [ Events ] [ Discounts ]
  Tab bar:
    - Full width of right column, 52px tall, bg #1c1e2a, radius 14
    - Each tab = half width - 6px gap, 44px tall, radius 10
    - Active tab: colored bg (purple for Events, green for Discounts) at 20% opacity
    - Active tab text: full color (purple or green), Semi Bold
    - Inactive tab text: #9fa0a1, Regular
    - NO underline beneath the active tab

EVENTS TAB (purple theme — #AE3BD6):
  - Panel bg: purple radial gradient (top-center glow, fades to #12131a)
  - "Active Events" label in purple
  - Each event card (#2a2d32, radius 12):
      Purple left accent bar (4px wide)
      Date range (muted, top-left)
      "X days left" badge (purple, 20% opacity bg)
      Event name (white, Semi Bold)
      Description (text-secondary)
      Chevron › (purple, right side)
  - "Already missed" section (divider + dimmed cards at 55% opacity):
      Grey left bar, grey "Expired" badge, muted text

DISCOUNTS TAB (green theme — #44d62c):
  - Panel bg: green radial gradient (top-center glow, fades to #12131a)
  - "Store Prices" label in green  ← NOT "Active Discounts"
  - IMPORTANT: Discounts tab shows PLATFORM STORE PRICES for the game
    (Steam, Epic, PlayStation Store, Xbox Store, GOG, etc.)
    NOT in-game promotional events — those belong in the Events tab
  - Each store row card (#2a2d32, radius 12):
      Green left accent bar
      Platform tag (PC / PS5 / Xbox, small grey pill)
      Store name (white)
      "BEST PRICE" badge on the cheapest store
      Original price (muted, small, strikethrough feel)
      % OFF badge (green, 20% opacity bg)
      Current price (green, Bold, large)
      "Buy →" button (green tint, right side)
  - "Lowest Price Ever" section (below divider):
      Trophy icon + big green price + store name + date + % off label
      Card has subtle green border

EVENT COUNTDOWN TIMER:
  - Show "X days left" prominently on each active event card
  - Creates urgency, drives daily app opens
```

### Event / Discount Detail Page
```
Opened from chevron (→) on the game detail Events or Discounts tab

LAYOUT:
  - Game hero image at top (same as game page)
  - Game name + favorite star
  - Event/Discount title (e.g. "RP money now 30% off")
  - In-game deal image (e.g. screenshot of the item/bundle)
  - Description text + expiry info
  - Comments section: other users can comment on the event/discount
    - Shows: avatar, username, comment text, date, like/reply options
  - Comment input at bottom: "Comment on the event..."
```

### Deal Share Button
```
Location: game detail page header (next to back button and favorite)
Action: share the game's current best deal via native share sheet (WhatsApp, Telegram, etc.)
Format: "🎮 [Game Name] is [X]% off on [Store]! [link] — via DisLow"
```

### Friends System Pages
```
Accessed via: Friends icon (top-left header)

TABS: Following | Followers | Requests | Add

Following tab:
  - Online users shown first (green status), then Offline
  - Each entry: avatar, username, shared friends count, shared games count, remove (×) button

Followers tab:
  - Same layout as Following

Requests tab:
  - Pending friend requests: avatar, username, shared friends, shared games
  - Actions: Decline | Add

Add tab:
  - Search bar "Look for my friend..."
  - Search results with Add button
```

### Profile Page
```
Accessed via: Profile icon (top-right header)

CONTENT:
  - User avatar (large, circular)
  - Username
  - "Private" toggle button
  - Stats: Following count | Followers count
  - Notification preferences:
      Events toggle (on/off)   ← purple themed
      Discounts toggle (on/off) ← green themed
  - Settings links: Info, Suggestion, Help
  - Log out button (red text)
```

### Friend Profile Page (viewing another user)
```
Opened by: clicking a friend's name/avatar

CONTENT:
  - Friend's avatar + username
  - "Shared friends X, shared favorites Y" subtitle
  - Unfollow | Message buttons
  - Following | Followers counts
  - "[Friend's name] favorites" section — their public favorites grid
  - Following/Followers tabs: who they follow, who follows them
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

## Navigation Rules — Mobile vs Desktop
```
MOBILE (< 768px):
  - Fixed bottom navigation bar (4 tabs: Home | Notifications | Search — NO Favorites tab)
  - Side drawer for full navigation (Logo + items including Log out)
  - Floating header bar: radius 12, opacity 60%, blur 8px, contains tabs + expandable search

DESKTOP (≥ 1024px):
  - NO bottom nav — this is a web app, bottom nav looks wrong on desktop
  - Left sidebar navigation with: Logo, MENU (Home | Favorites | Notifications | Search), SOCIAL (Friends | Profile), Log out
  - Sidebar bg: rgba(30,38,51,0.40) = #1E2633 at 40% opacity + backdrop-filter: blur(8px) — GLASSMORPHISM
  - Sidebar width: 240px
  - IMPORTANT: Content area must have 20px padding from the sidebar's right edge — NEVER flush against it
  - Max content width: 1200px centered
  - Game card grids: 2 cols mobile → 3 cols tablet → 4–5 cols desktop
  - Game detail: two-column layout (game info + friends left, events/discounts right)
```

### Desktop Layout Spacing Rules (CRITICAL)
```
ALWAYS apply these on every desktop page:

1. Sidebar → Content gap:  20px padding between sidebar right edge and first content frame
   sidebar_width + 20px = where content starts (e.g. 240px sidebar → content at x=260)

2. Back button:  starts at (sidebar_width + 20px) from left, 20px from top
   glassmorphism: rgba(28,30,42,0.60) + blur(6px) + border-radius: 10px

3. Right content edge:  20px padding from screen right edge

4. Content frames must NEVER touch the sidebar — always the 20px gap.

NEVER skip the 20px padding. Check it on every new page built.
```

## Glassmorphism Rules (UPDATED — applies to several components)
```
The following components use glassmorphism (frosted glass):
  - Mobile home header:       #1E2633 at opacity 60%, blur(8px), radius 12px
  - Mobile side drawer:       #1E2633 at opacity 40%, blur(8px)
  - Desktop sidebar:          #1E2633 at opacity 40%, blur(8px)   ← same as mobile drawer
  - Desktop home TabBar:      #1E2633 at opacity 40%, blur(8px), radius 12px, floating
  - Game card info overlay:   #1C1E2A at opacity 70%, blur(8px)
  - Back button:              #1C1E2A at opacity 60%, blur(6px), radius 10px
  - Bottom nav:               bg-bg-primary/80, backdrop-blur-md

CSS pattern:
  background: rgba(R, G, B, opacity);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px); /* Safari */

NOTE: Sidebar and side drawer share the SAME glass style (#1E2633 at 40% opacity).
```

## Desktop Version Rules (full website — Option A)
```
The website is the SAME app as mobile, adapted for desktop screen widths.
NOT a marketing landing page — it is the full app experience on a bigger screen.
```

---

## Corner Radius — Global Rule
```
ALL UI elements use border-radius: 10px as the default.
This applies to: cards, buttons, inputs, modals, panels, badges, overlays.

Exceptions (explicitly different):
  - Game cards:           border-radius: 15px  (confirmed from Figma)
  - Floating header bar:  border-radius: 12px  (confirmed from Figma)
  - Back button:          border-radius: 10px  ← matches global rule
  - Avatar circles:       border-radius: 50%   (fully circular)
  - Small pill badges:    border-radius: 999px (fully rounded pill)

When in doubt → use 10px.
```

## Rules Summary (NEVER break these)
1. NEVER hardcode colors — use CSS variables or Tailwind tokens
2. NEVER use emoji for platform icons — SVG only
3. ALWAYS use CheapShark redirect links for store links
4. ALWAYS attach User-Agent header on CheapShark calls
5. NEVER call RAWG directly from frontend — proxy via backend
6. ALWAYS use `CoconPro` or `Nunito` as font family
7. PURPLE (#AE3BD6) = EVENTS only. GREEN (#44d62c) = DISCOUNTS/PRICES only. BLUE (#6475D1) = general app theme.
8. Game card: purple pill = LEFT SIDE EDGE of card (single circle, bleeds off left edge). ONE pill only, shows event count. NO green dot. Price = white text in overlay.
9. Console icons = SAME COLOR as card text (muted), NOT blue/purple/green
10. Game card info (title + genre + console icons + price) = OVERLAID on the cover photo with frosted glass bg
11. Notifications page = ONLY events/discounts from user's Favorites list
12. "Already missed" section = expired events/discounts (dimmed 55% opacity, not interactive)
13. "Friends following" row = ONLY on game detail page, not on cards
14. Game detail page TWO TABS: Events (purple) | Discounts (green)
15. Event countdown timer = show "X days left" on every active event item
16. Mobile home header = FLOATING pill, radius 12, opacity 60%, blur 8px — NOT full-width solid bar
17. Side drawer bg = #1E2633 at 40% opacity + blur(8px)
18. Log out = ALWAYS red text (#ef4444) + dark red icon bg (#3d1515). ALWAYS pinned to bottom of sidebar. NEVER inline with nav items.
19. Desktop sidebar = GLASSMORPHISM: rgba(30,38,51,0.40) + blur(8px). Items: Home | Favorites | Notifications | Search | Friends | Profile | Log out. Favorites IS in the desktop sidebar (MENU section).
20. Glassmorphism blur = 8px for UI components (header, drawer, card overlay). Back button = blur(6px) at 60% opacity.
21. DESKTOP CONTENT PADDING: ALWAYS 20px gap between sidebar right edge and first content frame. NEVER flush.
22. Back button on ALL detail pages = rgba(28,30,42,0.60) + blur(6px) + radius 10px. Position: sidebar+20px from left, 20px from top.
23. Discounts tab = STORE PRICES across platforms (Steam/Epic/PS/Xbox/GOG) + Lowest Price Ever. NOT in-game promotions.
24. Events tab = in-game events (XP weekends, seasonal modes, operator releases). NOT store sale prices.
25. Tab bar (Game Detail Events/Discounts) = NO underline. Active tab = colored bg 20% opacity + full color text. Home header TabBar = HAS thin underline (3px) beneath active tab. These two tab styles are DIFFERENT.
26. Desktop sidebar = GLASSMORPHISM (same as mobile drawer): #1E2633 at 40% opacity + blur(8px). NEVER render it solid. Both mobile drawer and desktop sidebar share the same glass background style.
27. Default corner radius = 10px for ALL elements. Exceptions: game cards = 15px, floating header = 12px, avatars = 50%, pills = 999px.
28. Nav icons = ALWAYS use the project SVGs from `svg gaming app/` folder. NEVER use icon libraries. Copy to `public/icons/` in the frontend.
