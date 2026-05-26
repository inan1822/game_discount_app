---
name: dislow-design-system
description: >
  Complete DisLow design-system reference — color semantics, every page's
  purpose, component rules, glassmorphism tokens, spacing, and admin UI.
  Use this skill whenever the user asks to build, style, or audit ANY page
  or component in the DisLow app. Triggers on: "build a page", "add a
  component", "style this", "match the design", "follow the design system",
  "what color should I use", "what does this page do", or any request to
  create/edit UI in this project.
---

# DisLow Design System Skill

You are building **DisLow** — a mobile-first game deal finder + community app.
Read every rule in this file before writing a single line of JSX or CSS.
These rules are NOT suggestions; they are the law for this codebase.

---

## Project Snapshot

| Item | Value |
|---|---|
| Frontend | Next.js 16 · React 19 · TypeScript · Tailwind 4 · shadcn/ui · framer-motion |
| Backend | Express 5 · TypeScript · MongoDB/Mongoose · JWT httpOnly cookies · socket.io |
| Root | `C:\FULLSTACK\lessons\AI Figma\gaming-app` |
| Client | `gaming-app/client/` |
| Server | `gaming-app/src/` |
| Admin UI | `client/app/admin/(protected)/` |

---

## Color Semantic System — THE MOST IMPORTANT RULE

Every color has **one and only one meaning**. Breaking this breaks the UX.

### PURPLE `#AE3BD6` = IN-GAME EVENTS ONLY
- In-game events: double XP weekends, seasonal modes, limited-time content
- Purple dot / pill on GameCard → this game has active events
- Radial gradient backgrounds on event sections
- Glow: `box-shadow: 3px 7px 20px 0px #A521D3B0`
- **NEVER** use purple for prices, discounts, or navigation accents

### GREEN `#44d62c` = DISCOUNTS / LOWEST PRICE ONLY
- Price drops, store sales, lowest price indicators
- Green left accent bar on discount cards
- "BEST PRICE" badge, "% OFF" badge, price text on Discounts tab
- Glow variant: `rgba(68,214,44,0.20)` background tint on deal cards
- **NEVER** use green for events or general UI elements

### BLUE `#6475D1` = MAIN APP THEME (everything else)
- Navigation active state, primary buttons, CTA buttons
- Background atmospheric blur blobs behind content
- Admin panel accent color (replaces cyan `#48BCF9` used in sidebar nav)
- Icon color when no event/discount context applies
- Notification dot for general/admin alerts
- Glow: `box-shadow: 3px 7px 20px 0px #6475D1B0`

### CYAN `#48BCF9` = SIDEBAR NAV ACTIVE STATE
- Active nav item text color in `AppSidebar` (the left sidebar)
- Active left indicator bar in `AppSidebar`
- Hover color on nav items
- **Only** in the left sidebar component

---

## Design Tokens — Use These, Never Hardcode

```css
/* Backgrounds */
--bg-primary:     #12131a;   /* main app background */
--bg-card:        #1c1e2a;   /* card / panel backgrounds */
--bg-surface:     #2a2d32;   /* elevated surface (modals, dropdowns) */
--bg-overlay:     rgba(0,0,0,0.6);

/* Brand */
--color-purple:       #AE3BD6;   /* EVENTS only */
--color-purple-light: #999FFA;   /* lighter purple accent */
--color-blue:         #6475D1;   /* app theme, buttons, admin */
--color-cyan:         #2ab7e6;   /* info elements */
--color-green:        #44d62c;   /* DISCOUNTS / PRICES only */
--sidebar-cyan:       #48BCF9;   /* sidebar nav active */

/* Text */
--text-primary:   #FFFFFF;
--text-secondary: #b3bade;
--text-muted:     #9fa0a1;

/* Borders */
--border-subtle:  rgba(188,188,201,0.15);
--border-faint:   rgba(255,255,255,0.05);

/* Shadows */
--shadow-card:    6px 4px 49px 0px rgba(0,0,0,0.7);
--shadow-purple:  3px 7px 20px 0px #A521D3B0;
--shadow-blue:    3px 7px 20px 0px #6475D1B0;
```

### Border Radius — Global Rule

| Element | Radius |
|---|---|
| Default (everything) | `10px` |
| Game cards | `15px` (confirmed Figma) |
| Floating mobile header | `12px` |
| Notification/event cards | `12px` or `14px` |
| Pill badges | `999px` (fully round) |
| Avatars | `50%` (fully circular) |

**When in doubt → `10px`.**

---

## Glassmorphism Pattern

Every frosted-glass element follows one of two recipes:

### Glass Panel (content cards, modals, admin panels)
```tsx
{
  background:           "rgba(28,30,42,0.70)",  // #1c1e2a at 70%
  backdropFilter:       "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border:               "1px solid rgba(188,188,201,0.15)",
  borderRadius:         10,
}
```

### Sidebar / Drawer Glass (navigation surfaces)
```tsx
{
  background:           "rgba(30,38,51,0.40)",  // #1E2633 at 40%
  backdropFilter:       "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  borderRight:          "1px solid rgba(255,255,255,0.05)",
}
```

### Card Info Overlay (on top of game cover images)
```tsx
{
  background:           "rgba(28,30,42,0.70)",
  backdropFilter:       "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  borderRadius:         "0 0 15px 15px",  // bottom only, matches card
}
```

### Back Button (all detail / sub-pages)
```tsx
{
  background:           "rgba(28,30,42,0.60)",
  backdropFilter:       "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
  borderRadius:         10,
}
// Position: sidebar-width + 20px from left, 20px from top
```

### Admin Glass Panel
```tsx
{
  background:           "rgba(28,30,42,0.70)",
  backdropFilter:       "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border:               "1px solid rgba(188,188,201,0.15)",
  borderRadius:         10,
}
```

---

## Layout Rules

### Desktop Layout (≥ 1024px)
```
┌──────────────────────────────────────────────────────────────┐
│ AppSidebar (240px fixed) │  20px gap  │  Content area       │
│                          │            │  max-w varies        │
│                          │            │  20px right padding  │
└──────────────────────────────────────────────────────────────┘
```

- Sidebar: 240px, full height, glassmorphism (40% opacity)
- Content NEVER touches the sidebar — always 20px gap (`paddingLeft: 20`)
- Right edge: always 20px padding (`paddingRight: 20` or `px-8`)
- Content `max-width` varies by page (see per-page rules below)

### Mobile Layout (< 768px)
- Fixed bottom navigation bar (4 tabs)
- Side drawer for full navigation (swipe or hamburger)
- Floating header bar: radius 12, 60% opacity, blur 8px

### Page Outer Wrapper (all main app pages)
```tsx
<main className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#1E2532" }}>
  <PageBackground />
  <div className="relative flex h-full" style={{ zIndex: 3 }}>
    <AppSidebar />
    <div className="flex-1 min-w-0 overflow-y-auto"
         style={{ scrollbarWidth: "none" }}>
      {/* page content */}
    </div>
  </div>
</main>
```

**ALWAYS use this wrapper on every new main app page.**

---

## Shared Component Rules

### `AppSidebar` (`components/layout/AppSidebar.tsx`)
Single source of truth for desktop navigation. **Never copy-paste a sidebar.**

Nav items (in order):
1. Home → `/`
2. Notifications → `/notifications` (has unread dot)
3. Search → `/search`
4. Purchases → `/account/orders`
5. Friends → `/friends`
6. Profile → `/profile`

Auth-gated (redirect to `/login` if not logged in): Notifications, Friends, Profile, Purchases.

Active state: cyan `#48BCF9` text + `rgba(52,82,229,0.13)` background + 3px cyan left bar.
Cursor-glow effect: radial gradient follows mouse, opacity 0.13 when hovered.
Logout/Login pinned at bottom.

### `PageBackground` (`components/ui/PageBackground.tsx`)
Atmospheric blur blobs (purple + blue, `blur-[315px]`). Import and render at the top of every page's outer wrapper. Never add it twice.

### `NotificationDot` (`components/ui/NotificationDot.tsx`)
- Both events + discounts unread → split dot (purple left, green right, CSS conic-gradient)
- Only events unread → solid purple `#A855F7`
- Only discounts unread → solid green `#22C55E`
- Used in AppSidebar on Notifications item, and on home header bell

### `GameCard` (`components/game/GameCard.tsx`)
- Full-bleed cover image, `borderRadius: 15px`
- Frosted glass info overlay at bottom (title + genre + platform icons + price)
- Purple left-side pill if game has active events (shows event count)
- Price = white text inside overlay (NOT a colored badge)
- Platform/console icons = same muted color as text, NEVER brand colors
- Hover: framer-motion tilt effect

### `BottomNav` (`components/layout/BottomNav.tsx`)
Mobile only. 4 tabs: Home · Notifications · Search · [varies].
Active tab: `#AE3BD6` (purple). Inactive: `#9fa0a1`.
`bg-bg-primary/80 + backdrop-blur-md`, fixed bottom.

### Inputs / Form Fields
```tsx
{
  background:  "#1c1e2a",
  border:      "1px solid rgba(188,188,201,0.15)",
  color:       "#fff",
  borderRadius: 10,
  outline:     "none",
}
// Placeholder color: #9fa0a1
// Label color: #9fa0a1
```

### Status Badges (orders, tickets)
```
pending   → amber   #F59E0B  (rgba(245,158,11,0.15) bg)
paid      → blue    #6475D1  (rgba(100,117,209,0.15) bg)
delivered → green   #44d62c  (rgba(68,214,44,0.15) bg)
cancelled → red     #EF4444  (rgba(239,68,68,0.15) bg)
refunded  → muted   #9fa0a1  (rgba(159,160,161,0.15) bg)
```

---

## Every Page — Purpose & Design

### `/` — Home Page
**Purpose:** Main browsing screen. Shows curated game sections.

Sections (parallel fetch): Popular · New · Trended · For You · Hidden Gems · Deal of the Day.

Desktop: AppSidebar + scrollable multi-section game grid.
Mobile: floating glassmorphism header (radius 12, 60% opacity) with scrollable tabs (Popular | New | Trended | Favorites | Notifications) + expandable search icon.

Tab meanings:
- **Favorites** → only games the user has hearted/saved
- **For You** → recommendations based on user's Favorites list
- **Popular** → globally popular right now
- **New** → recently released
- **Trended** → viral / trending

Atmospheric background: large purple + blue blur blobs behind content.

---

### `/game/[id]` — Game Detail Page
**Purpose:** Full info on one game — media, friends who follow it, store prices, active events.

Desktop layout: two-column
- Left col (~440px): hero image · title · genre tags · platform row · friends following row · "Visit Game Store" CTA · About section
- Right panel: **Events tab** (purple) | **Discounts tab** (green)

**Events tab (purple `#AE3BD6`)**:
- Shows IN-GAME events (XP weekends, seasonal modes, operator drops)
- Purple radial gradient background
- Each card: purple left accent bar · date range · "X days left" badge · event name · description
- "Already missed" section: expired events, 55% opacity, grey bar

**Discounts tab (green `#44d62c`)**:
- Shows STORE PRICES across platforms (Steam, Epic, PS, Xbox, GOG)
- NOT in-game promotions — those go in Events
- Each row: green left bar · platform pill · store name · % OFF badge · current price · "Buy →" button
- "Lowest Price Ever" section at bottom: trophy icon + big green price + date

Hero image buttons: Favorite star (top-right, purple fill when saved) · Share button (native share sheet).
Back button: glassmorphism (`rgba(28,30,42,0.60)` + blur 6px + radius 10).

---

### `/search` — Search Games
**Purpose:** Find any game by name.

Behavior:
- Auto-focus input on load
- 500ms debounce before firing RAWG search
- Fuse.js re-ranks results: if top score < 0.3 (high confidence), use Fuse order; else fall back to RAWG order
- Grid: 2 cols mobile → 3 cols desktop

Desktop: AppSidebar + search input + 3-col GameCard grid.
Mobile: floating search bar at top (no sidebar).

---

### `/notifications` — Notifications Feed
**Purpose:** All events + discounts from games in the user's Favorites list, newest first.

Auth-gated: redirects to `/login` if not logged in.

Tabs: All | Events | Discounts
- Events tab: purple-tinted rows, `#A855F7` left border
- Discounts tab: green-tinted rows, `#22C55E` left border
- Each row: unread dot (top-right) · title · body · relative time ("2h ago") · Read / Dismiss actions

Infinite scroll (load 20 at a time).
"Mark all read" button top-right (only visible when unread count > 0).
Click row → marks read → navigates to game page or external link.

---

### `/friends` — Friends System
**Purpose:** Social graph management — who you follow, followers, pending requests, search.

Auth-gated.

Tabs:
- **Following** → people you follow (online first, then offline)
- **Followers** → people who follow you
- **Requests** → incoming friend requests (Decline | Add buttons)
- **Add Friend** → search bar to find users

Each entry: avatar · username · shared friends count · shared games count · action button.
Tab bar: glass card style, active tab `#6475D1` accent.

---

### `/profile` — User Profile
**Purpose:** Account management hub.

Auth-gated.

Sections:
1. **Avatar block** — click to open AvatarPicker modal · display name · email · Private Account toggle (visual)
2. **Stats row** — Following | Followers | Favorites counts (real counts from DB)
3. **Notification Preferences** — Events toggle (purple) · Discounts toggle (green) · PATCH to API on change
4. **Account links** — Edit Profile · Change Password · Linked Accounts
5. **Support links** — Help Center · Send Feedback · Report a Bug · Privacy Policy · Terms · Export Data · Delete Account
6. **Log Out button** — red `#ef4444`, `rgba(239,68,68,0.06)` background, full width

---

### `/account/orders` — Purchase History
**Purpose:** User's full order history + support ticket system.

Two tabs:
- **Orders tab** — paginated list of all purchases; each card shows: status badge · product name · amount · key reveal button (for delivered orders) · "Get Help" button
- **Support tab** — user's support tickets; click to open SupportDrawer thread

**Key reveal**: fetches key from `GET /api/v1/checkout/orders/:id/key` on demand; masked until clicked; copy-to-clipboard button.

**SupportDrawer** (G2A-style 3-step):
1. Pick problem category (7 options)
2. Write description (min 10 chars)
3. Message thread (user right / admin left bubble layout)

---

### `/wishlist` — Favourites
**Purpose:** Games the user has saved/hearted. Equivalent of a watchlist.

Simple list view: cover thumbnail · game name · date added · remove heart button.
Click row → navigate to `/game/[id]`.
Empty state: heart icon + "No games saved yet" message.

Desktop: AppSidebar + list. Mobile: back button + list + BottomNav.

---

### `/login` — Login + 2FA
**Purpose:** Single login entry point for both regular users and admins.

Regular users: email + password → JWT cookie → redirect to `/`.
Admin users: email + password → 2FA OTP step → JWT cookie → redirect to `/admin`.

Auth flow: httpOnly `dislow_token` cookie (no localStorage).
Design: centered dark card, glass panel style, brand-blue CTA button.

---

### `/register` — Registration
**Purpose:** Create a new user account.

Fields: name · email · password · confirm password.
After success: auto-login → redirect to `/`.
Password rules: min 8 chars, at least 1 letter + 1 digit.

---

### `/checkout` — Purchase Flow
**Purpose:** Buy a game key (free or paid).

Free products: key delivered immediately + email receipt with key.
Paid products: Stripe payment → confirmation email → key delivered via webhook.

Success page shows: email confirmation notice + link to `/account/orders`.

---

## Admin Panel — `/admin/*`

All admin routes are behind `(protected)/layout.tsx` which gates via the `dislow_token` cookie with `role: "admin"`. Non-admins are redirected to `/login`.

Admin design uses the same glass panel tokens as the main app but with a dedicated `AdminSidebar` component.

### Admin Color Overrides
- Accent: `#6475D1` (brand blue — no cyan)
- Muted text: `#9fa0a1`
- Secondary text: `#b3bade`
- NO slate-* Tailwind classes — inline styles only

### `/admin` — Dashboard
**Purpose:** Real-time KPI overview for store operations.

KPI cards (glass panel): Total Revenue · Orders Today · Active Users · Low Stock count.
Each card: metric value + delta % vs previous period (green up arrow / red down arrow).

Revenue chart: line chart (last 30 days).
Recent Orders table: last 5 orders with status badge.
Top Products: top 5 by unit sales + revenue.

Socket.io live updates: new orders flash the "Orders Today" card and append to Recent Orders.

### `/admin/orders` — Order Management
**Purpose:** Browse, filter, and manage all customer orders.

Filter bar: status Select · date range inputs · email search · Export CSV button.
Table columns: Order ID (truncated) · Customer Email · Products · Total · Status badge · Date · inline Status Select.

Status badge colors: see Status Badges section above.
Inline status change: optimistic update → PATCH `/api/v1/admin/orders/:id`.
Export CSV: browser download via `GET /api/v1/admin/orders/export`.

### `/admin/orders/[id]` — Order Detail
**Purpose:** Full order info — items, amounts, promo, payment ref, status history.

Shows all order items with unit prices + key IDs. Manual status override control.

### `/admin/products` — Product Catalog
**Purpose:** Manage game key products in the store.

Table columns: Cover thumbnail (40×40) · Name · Category pill · Platform · Price · Available Keys badge (green ≥5, amber 1-4, red 0) · Active toggle · Actions.

Available Keys badge meanings:
- `≥ 5` → green `#44d62c` (plenty of stock)
- `1–4` → amber `#F59E0B` (low stock warning)
- `0` → red `#EF4444` (out of stock — product auto-hides from storefront)

"+ New Product" CTA links to `/admin/products/new`.

### `/admin/products/new` and `/admin/products/[id]/edit` — Product Form
**Purpose:** Create or edit a product listing.

Fields: name · description · imageUrl · price · platform (Select) · category (Select) · isActive toggle.

RAWG Game Picker (shown for category: "gamekey" or "dlc"):
- Debounced text search → calls `/api/v1/games/search?q=` (no auth needed)
- Dropdown: game thumbnail + name + release year
- On select: autofills rawgGameId · rawgGameName · imageUrl from RAWG cover
- "No game link" clears rawgGame fields (for gift cards / subscriptions)

Category meanings:
- `gamekey` → PC/console activation code for a full game
- `giftcard` → store credit (Steam, PSN, Xbox gift cards)
- `subscription` → recurring service (Xbox Game Pass, PS Plus, etc.)
- `dlc` → downloadable content for an existing game
- `currency` → in-game currency packs (V-Bucks, FIFA Points, etc.)

### `/admin/products/[id]/keys` — Key Inventory
**Purpose:** View, import, and manage individual game key codes for a product.

Table: index · masked code `****-****-****` · status badge · sold date.
Status badge: available=green · reserved=amber · sold=muted.
"Reveal / Export" button: fetches keys with `?reveal=1`, triggers CSV download.

Key Uploader:
- Textarea: "Paste one key per line…"
- Parse button: splits by newline, trims, shows "X keys ready to import"
- Import: POST to `/api/v1/admin/products/:id/keys` → toast "✓ N imported, N duplicates skipped"
- Duplicate prevention: unique index on `code` field in GameKey model

### `/admin/users` — User Management
**Purpose:** Browse and manage registered users.

Table columns: Avatar · Name · Email · Role badge · Verified badge · Banned badge · Last seen · Actions.
Filter bar: search by name/email · role Select · banned filter.
Click row → `/admin/users/[id]` for full detail.

### `/admin/users/[id]` — User Detail
**Purpose:** Full profile of one user — account info, order history, lifetime spend.

Sections: account fields (editable role + banned toggle) · recent orders table · lifetime spend stat.

### `/admin/promos` — Promo Codes
**Purpose:** Create and manage discount codes for the store.

Promo types: `percent` (e.g. 20% off) or `fixed` (e.g. $5 off).
Fields: code · type · value · minOrderAmount · maxUses · expiresAt · isActive.
Usage tracking: `usedCount` auto-incremented on each valid redemption.

### `/admin/broadcast` — Push Notifications
**Purpose:** Send a notification to all users or filtered segments.

Compose: title + body. Preview how it will look in the notification feed.
History table: shows past broadcasts with recipient count + sent time.

### `/admin/analytics` — Analytics Dashboard
**Purpose:** Deeper business metrics beyond the dashboard KPIs.

Period selector: 7 · 14 · 30 · 90 days.
Charts: revenue series · orders series · new users series.
Breakdowns: orders by status (donut) · revenue by category (bar) · top products table.
Avg order value KPI.

---

## Typography

Primary font: `CoconPro` (commercial). Fallback: `'Nunito'` from Google Fonts.

| Token | Size | Weight | Use |
|---|---|---|---|
| heading-1 | 64px | 400 | Hero titles |
| heading-2 | 48px | 400 | Page titles |
| heading-3 | 32px | 400 | Section titles |
| body | 28px | 400 | General text |
| body-small | 22px | 350 | Secondary text |
| caption | 16px | 350 | Labels, captions |
| bold | 32px | 700 | CTAs, emphasis |

In practice on the web, pages use `text-xl` / `text-2xl` / `text-sm` Tailwind classes. Always prefer `Nunito` if CoconPro is not available.

---

## SVG Icons — Project Icon Set

Navigation icons come from the project's own SVG files, NOT lucide-react or any icon library.

```
Location: C:\FULLSTACK\lessons\AI Figma\gaming-app\svg gaming app\
Copy to:  client/public/icons/

home.svg                    → Home nav
favoties 1=Default.svg      → Favorites inactive
favoties 1=Variant2.svg     → Favorites active
notifications.svg           → Notifications nav
search.svg                  → Search nav
freinds.svg                 → Friends nav
logo.svg                    → DisLow logo mark
```

For OTHER icons (lucide-react is fine): `BellRing`, `Receipt`, `Users`, `User`, `Home`, `Search`, `LogIn`, `Package`, `ShoppingBag`, etc. within components.

Platform/console icons: `client/public/icons/platforms/`. Same muted color as surrounding text. Never emoji.

---

## Background Atmospheric Effects

Every page has decorative blur blobs positioned absolutely behind content:

```tsx
// Purple blob (events / general)
<div className="absolute blob-purple w-[315px] h-[315px] blur-[315px]"
     style={{ background: "rgba(174,59,214,0.30)", top: 0, right: 0 }} />

// Blue blob (theme)
<div className="absolute blob-blue w-[352px] h-[352px] blur-[352px]"
     style={{ background: "rgba(100,117,209,0.30)", top: "30%", left: "-10%" }} />
```

Use the `PageBackground` component instead of placing blobs manually. Only put it at the outermost wrapper — never nest it.

---

## Rules Summary — Never Break These

1. **Color semantics**: PURPLE = events. GREEN = discounts/prices. BLUE = general theme. CYAN = sidebar nav active. Never swap them.
2. **No hardcoded hex** — always use the CSS variables or inline style tokens from this document.
3. **No slate-* Tailwind** — use inline styles with DisLow tokens.
4. **AppSidebar is the single NAV** — never copy-paste sidebar markup into a page.
5. **PageBackground once** — never render it more than once per page tree.
6. **20px gap** — content always has 20px left padding after the sidebar. Never flush.
7. **Glassmorphism** — every surface that overlays content must have backdrop-filter blur. See recipes above.
8. **Border radius 10px default** — game cards 15px, floating header 12px, pills 999px, avatars 50%.
9. **Game card**: purple left-side pill for events. Price = white text in overlay. No green dot on cards.
10. **Events tab ≠ Discounts tab**: Events = in-game activities. Discounts = store prices. Never mix.
11. **Mobile = floating pill header** (radius 12, 60% opacity, blur 8px). Desktop = sidebar.
12. **Log Out** = always red `#ef4444`, dark red bg `rgba(239,68,68,0.06)`. Pinned bottom in sidebar.
13. **Nav icons**: use project SVGs from `public/icons/`. Only lucide-react for non-nav icons.
14. **Platform icons** = muted text color. Never brand colors.
15. **Admin pages**: `role: "admin"` gate, same glass tokens, `#6475D1` accent, no slate-*.
16. **Available Keys badge**: ≥5 green, 1–4 amber, 0 red. Auto-hides product at 0 stock.
17. **Promo codes**: `percent` = percentage off, `fixed` = dollar off. Both capped by `minOrderAmount`.
18. **httpOnly cookie only** — JWT never in localStorage. Auth state via `AuthContext` → `/auth/me`.
19. **RAWG never called from frontend directly** — proxy through `/api/v1/games/*`.
20. **CheapShark called directly from browser** — always with `User-Agent: DisLow/1.0 (email)`.
