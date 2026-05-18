# DisLow — Complete Design System Skill
**Stack: TypeScript + React + Next.js 15 (App Router) + Tailwind CSS v4 + shadcn/ui**

Reference this file before implementing ANY component, page, or style in DisLow.
This is the single source of truth for all design decisions.

---

## 1. Color Semantic System — THE MOST IMPORTANT RULE

Every color has a fixed semantic meaning. Swapping them is a design error.

| Color | Hex | Meaning | Where it appears |
|---|---|---|---|
| **Purple** | `#A521D3` | IN-GAME EVENTS | Event badges, event tab, event bg gradient, purple dot on cards |
| **Green** | `#44D62C` | DISCOUNTS / PRICES | Discount badges, price tags, discount tab, green bg gradient, green dot on cards |
| **Blue** | `#3452E5` | APP THEME | Navigation active state, button hover, atmospheric blobs |
| **Cyan** | `#49BCF9` | Secondary info | Icons, secondary highlights |
| **Purple-Light** | `#999FFA` | Gradient / soft accent | Used with purple in gradients |
| **Blue-Grey** | `#3F4D6F` | UI surface | Elevated cards, surfaces |

### Background Colors
```
Main background:     #1E2532   (dark navy — primary app bg)
Darker background:   #283553   (slightly darker, used for depth layers)
Card surface:        #1c1e2a   (card backgrounds)
Elevated surface:    #2a2d32   (inputs, raised elements)
```

### Login Page — Full Background Gradient (confirmed from Figma)
```css
/* The login page uses a single linear gradient across the ENTIRE page width.
   It does NOT have separate left/right panel backgrounds.
   The gradient unifies both panels into one breathing surface. */
background: linear-gradient(90deg, #841D80 0%, #30A5E6 100%);
/* Note: #841D80 starts at 5% opacity in Figma — very subtle purple on left */
/* The game art on the left panel sits on top of this gradient */
```

### Social Login Icons — Radial Gradient Backgrounds
```css
/* Each social icon (Google, Steam, Discord) has its OWN small circular
   radial gradient glow behind it. NOT a flat dark circle. */
/* Use real brand icons: Google SVG, Steam SVG, Discord SVG */
/* Never use placeholder letters (G/S/D) */
background: radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%);
```

### Radial Gradient Backgrounds (context-aware — game/event pages)
```css
/* Events context — purple glow behind content */
background: radial-gradient(ellipse at top, rgba(165,33,211,0.3) 0%, transparent 65%);

/* Discounts context — green glow behind content */
background: radial-gradient(ellipse at top, rgba(68,214,44,0.25) 0%, transparent 65%);
```

### CSS Variables (globals.css — canonical values)
```css
:root {
  --background:         #1E2532;
  --background-deep:    #283553;
  --foreground:         #FFFFFF;
  --card:               #1c1e2a;
  --card-foreground:    #FFFFFF;
  --surface:            #2a2d32;

  /* Semantic colors */
  --color-purple:       #A521D3;   /* EVENTS ONLY */
  --color-purple-light: #999FFA;   /* gradient / soft */
  --color-blue:         #3452E5;   /* APP THEME */
  --color-cyan:         #49BCF9;   /* secondary info */
  --color-green:        #44D62C;   /* DISCOUNTS ONLY */
  --color-blue-grey:    #3F4D6F;   /* surfaces */

  /* Text */
  --text-primary:       #FFFFFF;
  --text-secondary:     #b3bade;
  --text-muted:         #9fa0a1;

  /* Borders */
  --border-subtle:      rgba(188,188,201,0.25);

  /* Shadows */
  --shadow-purple:      0px 0px 20px 0px rgba(165,33,211,0.69);
  --shadow-blue:        0px 0px 20px 0px rgba(52,82,229,0.69);
  --shadow-card:        6px 4px 49px 0px rgba(0,0,0,0.7);
}
```

---

## 2. Typography

**Font:** `Nunito` via Google Fonts (substitute for commercial CoconPro used in Figma)
**Weights used:** 300 (Light), 400 (Regular), 700 (Bold)

```tsx
// app/layout.tsx
import { Nunito } from "next/font/google"
const nunito = Nunito({ subsets: ["latin"], weight: ["300","400","600","700","800"] })
```

| Element | Size | Weight | Color |
|---|---|---|---|
| Page title | `text-xl` 20px | 700 Bold | white |
| Section heading | `text-sm` 14px | 700 Bold | white |
| Game title (card) | `text-sm` 14px | 600 Semibold | white |
| Body / description | `text-sm` 14px | 400 Regular | `#9fa0a1` |
| Caption / meta | `text-xs` 12px | 400 Regular | `#9fa0a1` |
| Discount badge | `text-xs` 12px | 700 Bold | `#000` on green bg |
| Price | `text-sm` 14px | 700 Bold | white |
| Event countdown | `text-xs` 12px | 600 Semibold | matches tab color |

---

## 3. User Flows (from Figma research pages)

### Event Flow
```
Splash screen
  → Explore (home)
      ├── Hamburger menu (mobile) / Sidebar (desktop)
      └── new user?
          ├── Login → game page
          └── Register → Sign up → game page
              → game page
                  ├── Events tab
                  │     → game store (external link)
                  │     → game event detail
                  │           → Comment
                  └── History Events (= "Already missed" section)
```

### Like & Follow Flow (IMPORTANT — two separate actions)
```
Splash → Explore
  → Long press on game (mobile) / hover menu or right-click (desktop)
      → Like / Follow page
          ├── Like    = thumbs up rating — affects "Popular" + "For You" recommendations
          └── Follow  = add to Favorites + subscribe to event/discount notifications
```

**Like ≠ Follow — they are different:**
- **Like** → increments a like counter on the game, feeds into Popular/For You ranking
- **Follow** → adds game to user's Favorites list AND enables notifications for that game

### Search Flow
```
Splash → Explore
  → Search bar (header or search tab)
      → Search page (results)
          → game page
              ├── Event
              └── History Event
```

---

## 4. Navigation — Mobile vs Desktop

### Mobile (< 768px) — Bottom Nav
```
Fixed bottom bar, 4 tabs:
  🏠 Home        → explore / all tab sections
  ⭐ Favorites   → games the user follows
  🔔 Notifications → events + discounts from followed games
  🔍 Search      → game search

Hamburger icon (☰) in header → slides out side menu with full nav
Active color: #A521D3 (purple)
Inactive color: #9fa0a1 (muted)
Background: rgba(30,37,50,0.85) backdrop-blur-md
```

### Desktop (≥ 1024px) — Sidebar + Top Header
```
NO bottom nav on desktop (web convention — bottom nav = mobile app pattern)

Left sidebar (240px fixed):
  - DisLow logo + wordmark
  - Home
  - Favorites
  - Notifications
  - Search
  - ─── divider ───
  - Friends
  - Profile
  - ─── bottom ───
  - Logout

Top header bar (full width):
  Left:   DisLow logo
  Center: Search input bar (always visible on desktop)
  Right:  Friends icon | Profile icon | (if authed) logout

Content area: ml-[240px], max-w-[1200px] centered
```

---

## 5. Splash Screen

```tsx
// app/splash/page.tsx  OR  handled in app/layout.tsx on first load
// Shows briefly on app start before redirecting to Explore
// Contains: DisLow logo, animated loading indicator
// Duration: ~1.5s then redirect to /
// Colors: #1E2532 bg + purple/blue animated glow
```

---

## 6. Home / Explore Page

**File:** `app/page.tsx`

### Floating Header Bar (MOBILE — updated design)
```tsx
// The home screen header is a compact FLOATING pill bar — NOT full-width
// It floats over the game content below

<header className="
  sticky top-4 mx-4 z-50
  rounded-[12px]
  bg-[rgba(28,30,42,0.60)]
  backdrop-blur-[8px]
  flex items-center gap-2 px-3 py-2
">
  {/* Left: Filter icon */}
  <FilterIcon className="text-text-muted w-5 h-5" />

  {/* Center: Scrollable tabs */}
  <ScrollArea orientation="horizontal" className="flex-1">
    <div className="flex gap-4 text-sm whitespace-nowrap">
      {["Popular","New","Trended","Favorites","Notifications"].map(tab => (
        <button key={tab} className={active===tab ? "text-brand-purple font-semibold" : "text-text-muted"}>
          {tab}
        </button>
      ))}
    </div>
  </ScrollArea>

  {/* Right: Expandable Search + Profile */}
  {searchOpen
    ? <input autoFocus placeholder="Search..." className="flex-1 bg-transparent text-white text-sm outline-none" />
    : <SearchIcon onClick={() => setSearchOpen(true)} className="text-text-muted w-5 h-5 cursor-pointer" />
  }
  <ProfileAvatar />
</header>
```

### Home Page Tab sections:
```
Popular     → sorted by like count (global)
New         → recently released (sorted by release date)
Trended     → currently trending / viral games
Favorites   → games the user follows (personalized)
Notifications → event/discount feed for the user's Favorites
For You     → AI recommendations based on user's liked/followed games
```

### Game Card Grid
```
Mobile:  grid-cols-2  gap-3
Tablet:  grid-cols-3  gap-4   (md:)
Desktop: grid-cols-4  gap-5   (lg:)
Wide:    grid-cols-5  gap-5   (xl:)
```

### Side Drawer (MOBILE — new navigation)
```tsx
// Slide-out drawer from left edge
// Opened by menu icon OR swipe right

<Drawer side="left">
  <div className="
    h-full w-[280px]
    bg-[rgba(30,38,51,0.40)]
    backdrop-blur-[8px]
    flex flex-col p-6 gap-2
  ">
    {/* Logo */}
    <DisLowLogo className="mb-6" />

    {/* Nav items */}
    {[
      { icon: HomeIcon,         label: "Home",          href: "/" },
      { icon: StarIcon,         label: "Favorites",     href: "/favorites" },
      { icon: BellIcon,         label: "Notifications", href: "/notifications" },
      { icon: SearchIcon,       label: "Search",        href: "/search" },
      { icon: UsersIcon,        label: "Friends",       href: "/friends" },
      { icon: UserIcon,         label: "Profile",       href: "/profile" },
    ].map(item => <DrawerNavItem key={item.label} {...item} />)}

    {/* Log out — ALWAYS red, always at bottom */}
    <div className="mt-auto">
      <button className="flex items-center gap-3 text-red-500 font-medium w-full py-3">
        <LogOutIcon className="w-5 h-5" />
        Log out
      </button>
    </div>
  </div>
</Drawer>

// RULE: Log out is ALWAYS red (#ef4444 or text-red-500). Never style it as a normal nav item.
// RULE: Drawer bg = #1E2633 at 40% opacity + blur(8px)
```

---

## 7. Game Card Component

**File:** `components/game/GameCard.tsx`

### Structure (v2 — UPDATED design from Figma)
```
┌──────────────────┐
│                  │
│  [cover image    │ ← full-bleed, fills entire card, object-cover, rounded-[20px]
│   fills whole    │
│   card]          │
│ 🟣               │ ← purple pill on LEFT SIDE EDGE (only if active events exist)
│                  │
│ ┌──────────────┐ │ ← frosted glass overlay at bottom of card
│ │ Game Title   │ │    background: rgba(28,30,42,0.70)
│ │ Genre tag    │ │    backdrop-filter: blur(8px)
│ │ 🎮 💻  $9.99 │ │    platform icons + price text (right-aligned)
│ └──────────────┘ │
└──────────────────┘
```

### CRITICAL CARD RULES
```
1. Cover image fills the ENTIRE card height — no separate info area below the image
2. ALL game info (title, genre, platforms, price) is overlaid ON the photo via frosted glass
3. NO green dot on the card — price is plain white text inside the overlay
4. Purple event indicator = pill/badge on the LEFT SIDE EDGE of the card, not top-left corner
5. The card default background is changed (not the old #1c1e2a gradient)
```

### Frosted Glass Info Overlay
```tsx
// At bottom of card, overlaid ON the cover image
<div className="
  absolute bottom-0 left-0 right-0
  rounded-b-[20px]
  px-3 py-2
  bg-[rgba(28,30,42,0.70)]
  backdrop-blur-[8px]
">
  <p className="text-white text-xs font-semibold truncate">{game.name}</p>
  <p className="text-text-muted text-[10px]">{game.genre}</p>
  <div className="flex items-center justify-between mt-1">
    {/* Platform SVG icons — same muted color */}
    <div className="flex gap-1">{platformIcons}</div>
    {/* Lowest price — plain white text, NO green badge */}
    <span className="text-white text-xs font-bold">${game.lowestPrice}</span>
  </div>
</div>
```

### Purple Event Indicator (Side Pill)
```tsx
// On LEFT SIDE EDGE of card — only if game.hasEvents is true
// NOT top-left corner anymore
{game.hasEvents && (
  <div className="
    absolute left-0 top-1/3 -translate-x-1/2
    bg-[#AE3BD6] text-white
    text-[10px] font-bold
    rounded-full w-6 h-6
    flex items-center justify-center
    shadow-[0_0_8px_#AE3BD6]
  ">
    {game.eventCount}
  </div>
)}

// GREEN DOT IS REMOVED — do not add any green indicator to cards
```

### Long Press / Hover Interaction
```tsx
// Mobile: long press on card → opens Like/Follow bottom sheet
// Desktop: right-click or hover action menu → Like / Follow options

// Like action:  POST /api/v1/games/:id/like
//   Effect: increments like counter, affects Popular + For You rankings

// Follow action: POST /api/v1/wishlist
//   Effect: adds to Favorites list + subscribes to event/discount notifications
```

### Platform Icons
```
Color: var(--text-muted) = #9fa0a1  ← SAME as text, NOT colored with purple/green/blue
Size: 14px
Storage: public/icons/platforms/ (SVG files)
Files needed: pc.svg, ps5.svg, xbox.svg, switch.svg, mobile.svg
NEVER use emoji for platform indicators
```

---

## 8. Game Detail Page

**File:** `app/game/[id]/page.tsx`

### Full Layout
```
┌──────────────────────────────────────────────┐
│ ←  [Full-width hero image]           ★  🔗   │ ← back, favorite ★, share 🔗
├──────────────────────────────────────────────┤
│ Game Title                                    │
│ Party  FPS  Multiplayer   🎮 💻              │ ← genres + platform icons (muted color)
│ ──────────────────────────────────────────── │
│ Friends following: [avatar] [avatar] [+3]    │ ← friends who Follow this game
│                              [Game store →]  │ ← external link button
│ ──────────────────────────────────────────── │
│      [ Events ]      [ Discounts ]           │ ← TAB SWITCHER
│ ──────────────────────────────────────────── │
│  [Tab content + matching radial bg]          │
└──────────────────────────────────────────────┘
```

### Tab Switcher Rules
```tsx
// Default tab logic:
// - If game has active events → default to "Events" tab
// - If no events (or events expired) → default to "Discounts" tab
// - If neither → "Discounts" tab with empty state message

// Active tab styling:
// Events active:    text-[#A521D3] border-b-2 border-[#A521D3]
// Discounts active: text-[#44D62C] border-b-2 border-[#44D62C]

// Background shifts with tab:
// Events:    radial-gradient purple (see section 1)
// Discounts: radial-gradient green (see section 1)

// ONLY the background + list content changes — header/friends row stays the same
```

### Events Tab Content
```tsx
// Active events section:
events.active.map(event => <EventItem key={event.id} event={event} />)

// EventItem shows:
// - Date + time ("2022-09-23 15:00")
// - Countdown: "7 days left"  ← REQUIRED on every active item
// - Title: "New event!"
// - Description text
// - Chevron → navigates to /event/[id]

// "Already missed" section — History Events:
<SectionHeader>Already missed</SectionHeader>   // dimmed, uppercase, small
events.missed.map(event => <EventItem key={event.id} event={event} missed />)
// missed={true} → greyed out style, no chevron navigation
```

### Discounts Tab Content
```tsx
// Same structure as Events tab but green theme
// "Already missed" = expired discounts
// Acts as motivation: user sees what they missed → encourages setting alerts

// Empty state (no discounts at all):
<EmptyState message="No active discounts right now" icon={<Tag />} />
```

### Friends Following Row
```tsx
// Shows avatars of friends who Follow this game
// ONLY visible on game detail page — not on cards in any list view
// Horizontal scrollable row of circular avatars (32px diameter)
// Shows max 8, then "+X more"
// Label: "friends that's following"
// If user has no friends following: hide the row entirely (don't show empty)
```

### Countdown Timer
```tsx
// components/shared/CountdownTimer.tsx
// Required on EVERY active event and active discount item
// Format:
//   > 24h:  "7 days left"
//   < 24h:  "2 hours left"
//   < 1h:   "45 minutes left"
// Color: matches current tab (#A521D3 for events, #44D62C for discounts)
```

---

## 9. Event / Discount Detail Page

**Files:** `app/event/[id]/page.tsx` | `app/discount/[id]/page.tsx`

```
┌──────────────────────────────────────────────┐
│ ←  [Game hero image]                     ★   │
├──────────────────────────────────────────────┤
│ Game Name                                     │
│ ──────────────────────────────────────────── │
│ [Event/Discount banner image]                 │
│ "RP money now 30% off"                        │
│ "Limited to 5 purchases"                      │
│ 2022-09-23 15:00  •  7 days left             │
│ ──────────────────────────────────────────── │
│ Comments                                      │
│ [avatar] username              date           │
│ Comment text here...              ❤ Reply     │
│ [avatar] username              date           │
│ Comment text here...              ❤ Reply     │
│ ──────────────────────────────────────────── │
│ [Comment on the event...        ] [send]      │  ← input at bottom (mockup only)
└──────────────────────────────────────────────┘
```

**Note:** Comments section is a UI mockup — no backend needed for comments in v1.

---

## 10. Notifications Page

**File:** `app/notifications/page.tsx`

```tsx
// Shows ONLY events + discounts from games the user Follows (Favorites)
// If user follows 0 games → prompt: "Follow games to get notified"

// Three tabs: All | Events | Discounts
// "All" tab = merged chronological list
// "Events" tab:    purple theme, purple radial bg
// "Discounts" tab: green theme, green radial bg

interface NotificationItem {
  gameId: string
  gameCover: string
  gameName: string
  type: "event" | "discount"
  title: string           // "X2 XP every first place"
  description: string
  date: string
  daysLeft: number
  platforms: string[]
}
// Each item is tappable → navigates to /event/[id] or /discount/[id]
```

---

## 11. Search Page

**File:** `app/search/page.tsx`

```
Flow: Search bar → debounced query → results grid → game detail page

Features:
- Search input (auto-focused on page load)
- "Last search" section (recent searches from localStorage)
- Results: same GameCard grid
- Each result card → game detail page → Event / History Event tabs
- Empty state: "No games found for '{query}'"
- Loading: skeleton cards (6 cards animate-pulse)
```

---

## 12. Favorites / Wishlist Page

**File:** `app/wishlist/page.tsx`

```
Shows all games the user Follows.
Note: "Favorites" = games the user Follow'd (not just Liked)

Layout:
- Header: "Favourites" + game count
- List view: horizontal cards with cover (56x56px), name, date added, remove heart
- Each row tappable → game detail page
- Empty state: Heart icon + "No games saved yet" + "Long press ❤️ on any game to follow"
- Not logged in: show Sign In prompt
```

---

## 13. Profile Page

**File:** `app/profile/page.tsx`

```
Layout:
- Large circular avatar (80px)
- Username
- "Private" toggle button
- Stats row: [Following count] | [Followers count]
- Notification preferences:
    Events toggle     ← purple themed switch
    Discounts toggle  ← green themed switch
- Settings links: Info | Suggestion | Help
- "Log out" button (red text, bottom)
```

---

## 14. Friends System

**File:** `app/friends/page.tsx`

```
Header: Friends icon click → this page

4 TABS: Following | Followers | Requests | Add

Following tab:
  - Online section first (green status dot), then Offline
  - Each row: avatar, username, "Shared friends X  Shared games Y", remove (×)

Followers tab:
  - Same layout as Following

Requests tab:
  - Incoming requests: avatar, username, shared stats
  - Actions: [Decline] [Add]

Add tab:
  - Search input "Look for my friend..."
  - Results: avatar, username, [Add] button
```

---

## 15. Friend Profile Page (other user)

**File:** `app/profile/[userId]/page.tsx`

```
Layout:
- Avatar + username
- "Shared friends X, shared favorites Y" subtitle
- [Unfollow / Follow] [Message] buttons
- Stats: Following | Followers
- "[Name]'s favorites" game grid
- Following/Followers tabs (who they follow / who follows them)
- Each friend row: avatar, username, [Follow] or [Requested]
```

---

## 16. TypeScript Types

**File:** `types/game.ts`
```typescript
export interface Game {
  id: number
  name: string
  slug: string
  cover: string           // RAWG background_image URL
  rating: number
  metacritic?: number
  released?: string
  genres: string[]        // ["FPS", "Action", "Adventure"]
  platforms: string[]     // ["PC", "PS5", "Xbox Series X"]
  description?: string
  hasEvents?: boolean     // drives purple dot on card
  hasDiscount?: boolean   // drives green dot on card
  eventCount?: number
  lowestPrice?: number
}

export interface GameEvent {
  id: string
  gameId: string
  gameName: string
  gameCover: string
  type: "event" | "discount"
  title: string
  description?: string
  imageUrl?: string
  startDate: string
  endDate: string
  daysLeft: number         // calculated: Math.ceil((endDate - now) / 86400000)
  isMissed: boolean        // endDate < Date.now()
  discountPercent?: number // discount type only
  originalPrice?: number   // discount type only
  salePrice?: number       // discount type only
}

export interface PriceResult {
  dealID: string
  storeID: string
  storeName: string
  storeIcon?: string
  normalPrice: string
  salePrice: string
  savings: number
  dealLink: string  // ALWAYS: https://www.cheapshark.com/redirect?dealID=xxx
}

export interface WishlistItem {
  _id: string
  userId: string
  gameId: string
  gameName: string
  gameCover: string
  gameSlug: string
  addedAt: string
}
```

**File:** `types/user.ts`
```typescript
export interface UserProfile {
  _id: string
  name: string
  email: string
  avatar?: string
  isPrivate: boolean
  followingCount: number
  followersCount: number
  notifyEvents: boolean     // toggle in profile
  notifyDiscounts: boolean  // toggle in profile
}

export interface Friend {
  _id: string
  userId: string
  username: string
  avatar?: string
  isOnline: boolean
  sharedFriends: number
  sharedGames: number
  status: "following" | "follower" | "mutual" | "requested" | "none"
}
```

---

## 17. API Architecture

```
Frontend (Next.js browser)
  │
  ├── CheapShark API → DIRECT browser call (CORS supported, no key needed)
  │   Base URL: https://www.cheapshark.com/api/1.0
  │   REQUIRED header: 'User-Agent': 'DisLow/1.0 (bananagamer182@gmail.com)'
  │   Deal links: https://www.cheapshark.com/redirect?dealID=XXX  ← ALWAYS use this format
  │   File: lib/api/cheapshark.ts
  │
  ├── Our Express Backend → http://localhost:5000/api/v1
  │   ├── POST /auth/register
  │   ├── POST /auth/login
  │   ├── GET  /auth/me
  │   ├── GET  /games/search?q=&page=         → RAWG proxy
  │   ├── GET  /games/trending                → RAWG trending
  │   ├── GET  /games/genre?genre=&page=      → RAWG by genre
  │   ├── GET  /games/:id                     → RAWG game detail
  │   ├── GET  /wishlist                      → user Follows (auth required)
  │   ├── POST /wishlist                      → Follow a game (auth required)
  │   ├── DELETE /wishlist/:gameId            → Unfollow a game (auth required)
  │   ├── POST /games/:id/like               → Like a game (auth required)
  │   ├── GET  /events?gameId=               → events for a specific game
  │   ├── GET  /notifications                → events+discounts from user's Follows (auth)
  │   └── GET  /friends                      → friends list (auth required)
  │
  └── RAWG API → NEVER call from frontend
      Proxied through Express backend
      Key: RAWG_API in server .env only
```

---

## 18. Context / State Management

### AuthContext (`context/AuthContext.tsx`)
```typescript
interface AuthContextType {
  user: UserProfile | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}
```

### WishlistContext (`context/WishlistContext.tsx`)
```typescript
interface WishlistContextType {
  items: WishlistItem[]      // = user's Follows
  isLoading: boolean
  isInWishlist: (gameId: string) => boolean
  toggle: (game: Pick<Game, "id" | "name" | "cover" | "slug">) => Promise<void>
}
// Pattern: optimistic update → update UI immediately → sync backend → rollback on error
```

---

## 19. Component Patterns

### Buttons
```tsx
// Primary (purple gradient):
"bg-gradient-to-r from-[#A521D3] to-[#3452E5] text-white font-bold rounded-full px-6 py-3 hover:opacity-90 transition-opacity"

// Ghost (glass):
"glass rounded-full px-4 py-2 text-white text-sm border border-transparent hover:border-[#A521D3]/50 transition-all"

// Desktop hover: white text → blue (#3452E5) on hover
"text-white hover:text-[#3452E5] transition-colors"
```

### Glass Effect
```css
.glass {
  background: rgba(28, 30, 42, 0.8);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(188,188,201,0.25);
}
```

### Background Blobs (atmospheric depth)
```tsx
// Blue blob (app theme) — large, behind most content
<div className="absolute w-96 h-96 rounded-full pointer-events-none"
     style={{ background: "#3452E5", filter: "blur(350px)", opacity: 0.2 }} />

// Purple blob (events context)
<div className="absolute w-80 h-80 rounded-full pointer-events-none"
     style={{ background: "#A521D3", filter: "blur(315px)", opacity: 0.25 }} />
```

### Skeleton Loading
```tsx
// Always show skeletons — never a bare empty state flash
<div className="rounded-[20px] bg-[#1c1e2a] animate-pulse" style={{ aspectRatio: "3/4" }} />
```

### Toasts (react-toastify)
```tsx
// Positioned: bottom-center, dark theme
toast.success("Added to favourites ❤️")
toast.error("Something went wrong")
// Never use browser alert()
```

---

## 20. File Structure

```
client/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── game/[id]/page.tsx              ← game detail (Events/Discounts tabs)
│   ├── event/[id]/page.tsx             ← event detail + comments (mockup)
│   ├── discount/[id]/page.tsx          ← discount detail + comments (mockup)
│   ├── wishlist/page.tsx               ← user's Follows (Favorites)
│   ├── notifications/page.tsx          ← events+discounts from Follows
│   ├── search/page.tsx                 ← game search
│   ├── profile/page.tsx                ← own profile + settings
│   ├── profile/[userId]/page.tsx       ← other user's profile
│   ├── friends/page.tsx                ← Following/Followers/Requests/Add
│   ├── layout.tsx
│   ├── page.tsx                        ← home (Favorites/ForYou/Popular/New/Trended)
│   └── globals.css
├── components/
│   ├── ui/                             ← shadcn/ui components only
│   ├── game/
│   │   ├── GameCard.tsx                ← card: cover, dots, platform icons, genres
│   │   ├── GameGrid.tsx                ← responsive grid wrapper
│   │   ├── EventItem.tsx               ← event row (active or missed)
│   │   ├── DiscountItem.tsx            ← discount row (active or missed)
│   │   ├── GameTabSwitcher.tsx         ← Events | Discounts toggle
│   │   └── FriendsFollowingRow.tsx     ← avatar row on game detail only
│   ├── layout/
│   │   ├── BottomNav.tsx               ← mobile only (< 768px)
│   │   ├── Sidebar.tsx                 ← desktop only (≥ 1024px)
│   │   ├── Header.tsx                  ← page headers
│   │   └── RootLayout.tsx              ← switches mobile/desktop layout
│   ├── notifications/
│   │   └── NotificationItem.tsx
│   ├── friends/
│   │   ├── FriendRow.tsx
│   │   └── FriendSearch.tsx
│   └── shared/
│       ├── PlatformIcon.tsx            ← SVG platform icons (muted color)
│       ├── CountdownTimer.tsx          ← "X days Y hours left"
│       ├── ShareButton.tsx             ← Web Share API
│       ├── AvatarRow.tsx               ← scrollable avatar group
│       └── LikeFollowSheet.tsx         ← bottom sheet for Like/Follow action
├── context/
│   ├── AuthContext.tsx
│   └── WishlistContext.tsx
├── lib/
│   ├── api/
│   │   ├── axios.ts                    ← instance with JWT interceptor
│   │   ├── cheapshark.ts               ← direct CheapShark calls
│   │   ├── games.ts                    ← backend /games/*
│   │   ├── wishlist.ts                 ← backend /wishlist/*
│   │   ├── events.ts                   ← backend /events/*
│   │   └── friends.ts                  ← backend /friends/*
│   └── utils/
│       ├── formatCountdown.ts          ← "7 days left" / "2h left"
│       └── platformIcons.ts            ← name → SVG path map
├── types/
│   ├── game.ts
│   ├── user.ts
│   └── event.ts
└── public/
    └── icons/platforms/                ← pc.svg, ps5.svg, xbox.svg, switch.svg
```

---

## 21. Figma Reference

- **File key:** `WPF3cimH7v0S2mYT8JjXDl`
- **Figma URL:** https://www.figma.com/design/WPF3cimH7v0S2mYT8JjXDl/DisLow
- **Mobile frames:** Use as direct reference for desktop adaptation (Option A — same app, bigger screen)

### Figma MCP Workflow (always follow this order)
1. `get_metadata` on the file to map all node IDs
2. `get_design_context` on the specific screen node
3. `get_screenshot` for visual reference
4. Map all Figma colors → CSS variables in section 1 above
5. Reuse existing components before creating new ones
6. Validate implementation against the screenshot

---

## 22. Login Page Design Patterns (learned from Figma review)

```
BACKGROUND:
- Full 1440px linear gradient: #841D80 (5% opacity, left) → #30A5E6 (100%, right)
- This gradient flows under BOTH panels — no hard left/right split
- Game art images sit on top of the gradient on the left side
- Colored blobs (purple, green, purple-light) sit lower on the left panel, below the game art

SOCIAL LOGIN BUTTONS:
- Use REAL brand SVG icons: Google, Steam, Discord
- Each icon has a small radial gradient glow behind its circle
- background: radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)
- NEVER use letter placeholders (G/S/D)

LOGO PLACEMENT:
- Real SVG logo (Vector.svg icon + DisLow.svg wordmark)
- Positioned in the lower-center of the left panel
- Tagline underneath in Inter Light

BLOBS ON LEFT PANEL:
- #999FFA (purple-light) + #44D62C (green) overlapping in the lower-center area
- #A521D3 (deep purple) at top-left corner for depth
- All at reduced opacity with heavy blur (100-120px)
- Positioned BELOW the game art zone (below y=400 in a 900px frame)
```

---

## 23. Rules That Can Never Break

1. **PURPLE (`#A521D3`) = EVENTS only** — never use for discounts
2. **GREEN (`#44D62C`) = DISCOUNTS only** — never use for events
3. **BLUE (`#3452E5`) = APP THEME** — nav, icons, hover, bg blobs
4. **Console/platform icons = muted text color** (`#9fa0a1`) — NOT purple/green/blue
5. **Card dots: only render if true** — no empty dot placeholders
6. **Default tab on game detail = Discounts** (unless active events exist → then Events)
7. **"Already missed" = History Events** — dimmed, display only, no navigation
8. **Friends following row = game detail page only** — never on card lists
9. **NO bottom nav on desktop** — use left sidebar instead
10. **CheapShark links = always redirect format** — `cheapshark.com/redirect?dealID=XXX`
11. **RAWG = never call from frontend** — always proxy through backend
12. **Notifications = only from user's Follows** — not global events
13. **Like ≠ Follow** — Like = rating/popularity, Follow = Favorites + notifications
14. **Share button = Web Share API** with clipboard fallback
15. **Countdown timer on every active event/discount** — not optional
16. **Comments = UI mockup only** — no backend needed in v1
17. **Optimistic updates in WishlistContext** — update UI first, then backend, rollback on error
18. **Long press (mobile) / hover menu (desktop)** → Like/Follow action sheet
