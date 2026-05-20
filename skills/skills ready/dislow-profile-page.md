# DisLow Profile Page — Implementation Skill

A complete spec for building the `/profile` page in the DisLow gaming app.
Read this top-to-bottom before writing any code. Implement in phases — do
NOT try to ship everything in one PR.

---

## Context

**App:** DisLow — mobile-first game deal finder.
**Stack:** Next.js 16 App Router + React 19 + Tailwind 4 (client) ·
Express 5 + TypeScript + MongoDB/Mongoose (server) · JWT in httpOnly cookies ·
bcrypt rounds=12 · Joi validation · helmet + hpp + express-rate-limit.

**Repo root:** `C:\FULLSTACK\lessons\AI Figma\gaming-app`
**Profile page lives at:** `client/app/profile/page.tsx` (create if missing).
**Reference design:** an older mockup exists; DO NOT copy pixel-perfect — the
sidebar, background, and radii in the live app have evolved past it. Match the
live `/` and `/game/[id]` pages instead. The reference is only a structural guide.

---

## Visual Reference

```
┌────────────────────────────────────────────────────────────┐
│ Sidebar     │  ╭────────  Red gradient banner  ────────╮   │
│  Home       │  │                                         │   │
│  Notif. ●   │  │                ┌──────┐                 │   │
│  Search     │  │                │  B   │  (avatar)       │   │
│  ─SOCIAL─   │  │                └──────┘                 │   │
│  Friends    │  │              bananagamer182              │   │
│  Profile ●  │  │           banana@gmail.com               │   │
│             │  │            [Private Account ⚪]           │   │
│             │  ╰─────────────────────────────────────────╯   │
│             │   ┌─────────┬─────────┬─────────┐               │
│             │   │  248    │  1.2k   │  89     │               │
│             │   │Following│Followers│Favorites│               │
│             │   └─────────┴─────────┴─────────┘               │
│             │                                                 │
│             │   Notification Preferences                      │
│             │   ┌──────────────────────────────────┐ 🟣⚪    │
│             │   │ ● Events                         │          │
│             │   │   In-game events from favorites  │          │
│             │   └──────────────────────────────────┘          │
│             │   ┌──────────────────────────────────┐ 🟢⚪    │
│             │   │ ● Discounts                      │          │
│             │   │   Price drops from favorites     │          │
│             │   └──────────────────────────────────┘          │
│             │                                                 │
│             │   Account                                       │
│             │   ✎  Edit Profile                  →           │
│             │   🔒 Change Password                →           │
│             │   🔗 Linked Accounts                →           │
│             │                                                 │
│             │   Support                                       │
│             │   ?  Help Center                    →           │
│             │   💬 Send Feedback                  →           │
│             │   🐞 Report a Bug                   →           │
│             │   📄 Privacy Policy                 →           │
│             │   📜 Terms of Service               →           │
│             │   📤 Export My Data                 →           │
│             │   🗑️  Delete Account                →           │
│             │                                                 │
│             │   →  Log Out                                    │
└────────────────────────────────────────────────────────────┘
```

**Background banner:** red→purple radial gradient, full width, ~280px tall,
fades to the page background at the bottom. Use existing
`BackgroundGradientAnimation` if it accepts a color prop; otherwise build a
plain CSS gradient.

**Card style:** `rgba(28,30,42,0.70)` background, `1px solid rgba(255,255,255,0.05)`
border, `rounded-[14px]`, `backdrop-blur(8px)` — same as DiscountRow on the
game page. Reuse those exact tokens; do not invent new ones.

---

## Implementation Phases

Ship in this order. Each phase is independently mergeable.

### Phase 1 — Page shell + stats + Edit/Change/Linked navigation stubs
### Phase 2 — Avatar gallery + custom upload
### Phase 3 — Notification preferences + notification system end-to-end
### Phase 4 — Account section: Edit Profile + Change Password (with reauth)
### Phase 5 — Support section + legal pages
### Phase 6 — Delete Account + Export Data

---

## Phase 1 — Page shell + stats

### Backend

Add `GET /api/v1/users/me/stats` returning:

```ts
{ following: number; followers: number; favorites: number }
```

- `favorites` = `WishlistModel.countDocuments({ userId })`.
- `following` / `followers` — placeholder fields on `User`: `following: ObjectId[]`,
  `followers: ObjectId[]`. Default `[]`. Real follow system is out of scope for
  this phase; just return the array length.
- Add the two array fields to `User.model.ts` with `default: []`.

### Frontend

Create `client/app/profile/page.tsx`. Use the existing `<Sidebar>` with
`activeNav="Profile"`. Reuse layout patterns from `client/app/page.tsx`:

- Page wrapper: `relative w-screen h-screen overflow-hidden` + `BackgroundGradientAnimation`.
- Right column scrolls; sidebar fixed.
- `useAuth()` to gate the page — redirect to `/login` if `!user`.

Top section:
- Avatar circle (80px), purple gradient placeholder with first letter if no
  `avatarUrl` set. Click to open gallery (Phase 2 — for now, no-op).
- Display name + email below.
- Private Account toggle (visual only this phase; wire in Phase 4).
- Stats row: 3 equal columns. Numbers `text-2xl font-bold text-white`, labels
  `text-[10px] tracking-widest text-white/45`. Format with `Intl.NumberFormat`
  for `1.2k` style (use `notation: "compact"`).

Account + Support sections: render the row links as buttons that navigate to
`/profile/edit`, `/profile/password`, etc. Pages can be empty placeholders;
just need the buttons to not 404.

---

## Phase 2 — Avatar gallery + custom upload

### Backend

```
GET  /api/v1/users/me/avatar-gallery   → list of preset avatar URLs (static)
PATCH /api/v1/users/me/avatar          → body: { avatarUrl } OR multipart file
```

**Preset gallery:** ~12 game-themed avatars stored in `client/public/avatars/`.
Return absolute URLs. Hard-code the list in the service.

**Custom upload:**
- `multer` with `memoryStorage`.
- Validate mime type: only `image/png` and `image/jpeg`.
- Max size: **2 MB**. Reject larger with 413.
- Validate image is a real image (re-decode with `sharp` and resize to 256×256
  before storing). Strip EXIF.
- Storage: Cloudinary (env vars already configured in the codebase — check
  `src/shared/utils/` for an existing helper before adding new SDK code).
- Save the resulting CDN URL onto `user.avatarUrl`.

Add `avatarUrl: { type: String, default: null }` to User model.

### Frontend

`<AvatarPicker>` component, opens as a centered modal:

- Grid of preset avatars (3 cols, 4 rows). Click → PATCH avatar → close modal.
- "Upload Custom" tile triggers a hidden `<input type="file" accept="image/png,image/jpeg">`.
- Client-side: validate size < 2 MB before upload, show toast on reject.
- During upload show a spinner over the clicked tile.
- On success, optimistic update `AuthContext.user.avatarUrl`.

**Do not** allow setting an empty `avatarUrl` (no "remove avatar" button) —
the gallery covers that use case.

---

## Phase 3 — Notification preferences + notification system

This is the biggest phase. Read the whole section before starting.

### Data model

Add to User schema:

```ts
notificationPrefs: {
  events:    { type: Boolean, default: true },
  discounts: { type: Boolean, default: true },
}
```

New collection `notifications`:

```ts
{
  _id: ObjectId,
  userId: ObjectId,            // indexed
  type: "event" | "discount",  // determines color
  title: string,               // "Cyberpunk 2077 is 50% off"
  body: string,                // longer text
  gameId: number | null,       // RAWG id, for click-through
  gameSlug: string | null,
  link: string | null,         // optional external link (deal URL)
  read: boolean,               // default false
  createdAt: Date,             // indexed -1
}
```

Indexes:
- `{ userId: 1, createdAt: -1 }` compound for fast unread fetches.
- `{ userId: 1, read: 1 }` for unread count.
- TTL on `createdAt`: 30 days — notifications auto-expire.

### Endpoints

```
GET    /api/v1/notifications              → list, paginated (?limit=20&before=ISO)
GET    /api/v1/notifications/unread-count → { count: number }
PATCH  /api/v1/notifications/:id/read     → mark single read
PATCH  /api/v1/notifications/read-all     → mark all read for user
DELETE /api/v1/notifications/:id          → dismiss
PATCH  /api/v1/users/me/notification-prefs → body: { events?, discounts? }
```

All require auth. Apply standard rate limiter.

### Trigger sources

A real notification engine is a separate epic. For this phase, generate
notifications on these triggers:

1. **Discount notification** — when the wishlist deal-poller (existing cron or
   on-demand fetch) detects a price drop ≥10% on a game in the user's
   wishlist AND `user.notificationPrefs.discounts === true`, create a row.
2. **Event notification** — when the Steam events endpoint returns a NEW event
   for a wishlisted game (track last-seen-eventId per user × game in a tiny
   `notification_state` collection) AND `notificationPrefs.events === true`,
   create a row.

If a poller doesn't yet exist, leave a TODO comment and a manual seed
endpoint `POST /api/v1/dev/seed-notification` (DEV ONLY, gated by
`NODE_ENV !== "production"`) that creates a sample row for the current user.
That gates the UI work without blocking on the poller.

### UI — Notification page

`client/app/notifications/page.tsx`:
- List view, newest first, infinite scroll.
- Each row: 4px left border in `#A855F7` for `event` or `#22C55E` for `discount`.
- Background `rgba(28,30,42,0.70)`; unread rows get a faint `bg-white/[0.03]`
  overlay and a small dot on the right.
- Click row → mark read → navigate to the game page or external `link`.
- "Mark all read" button top-right.

### UI — Sidebar badge

In the existing `<Sidebar>`, the "Notifications" nav item gets a small dot to
its right when `unreadCount > 0`. Color:
- Both types unread → split dot (left half purple, right half green) using a
  CSS conic-gradient.
- Only events → purple `#A855F7`.
- Only discounts → green `#22C55E`.

Add `getUnreadByType()` to return `{ events, discounts }`. Poll every 60s OR
expose via Socket.io if already wired (check `server.ts` — at last review
Socket.io was NOT implemented; if still missing, use polling).

### UI — Header bell (home page)

Same color logic. The bell icon in the home header gets a dot using the same
component as the sidebar.

Extract the dot to a shared `<NotificationDot count={...} types={...} />`
component in `client/components/ui/`.

### Preferences toggles

In Profile page, the two toggles in "Notification Preferences" PATCH
`/users/me/notification-prefs` on change. Optimistic update. Show toast on
failure and revert.

---

## Phase 4 — Edit Profile + Change Password (with reauth)

### Edit Profile

`client/app/profile/edit/page.tsx`:
- Fields: `name`, `displayName`, `email`.
- A `currentPassword` field is REQUIRED before submitting any change.
- Submit hits `PATCH /api/v1/users/me/profile` with all 4 fields.

Backend:
- `bcrypt.compare(currentPassword, user.password)` — if false, 401.
- Run `bcrypt.compare` even when the user is OAuth-only (no local password) —
  use the `DUMMY_HASH` constant already present in `auth.service.ts` to avoid
  timing leaks. OAuth-only users can't reach this flow because they have no
  password to confirm; return 400 with an explanatory message instead.
- If `email` changes: re-run the email-verification flow (hash a code, send
  email, mark `isVerified = false`, store on a new `pendingEmail` field).
  Don't update `email` directly until the new email is verified.
- Add a strict rate limiter on this endpoint: 5 requests / 15 min per IP.

Joi schema enforcing:
- `name` 2–40 chars, letters/numbers/spaces only.
- `displayName` 2–24 chars, allow underscores.
- `email` valid + lowercased.
- `currentPassword` min 6 chars (server compares, doesn't validate strength).

### Change Password

`client/app/profile/password/page.tsx`:
- Fields: `currentPassword`, `newPassword`, `confirmNewPassword`.
- Server validates current via bcrypt, then sets `user.password = newPassword`
  (Mongoose pre-save hook handles hashing — verify this hook exists; it should,
  from the registration flow).
- After success: invalidate the JWT (the codebase stores `user.token` in DB
  for server-side revocation — clear it). User must log in again. Show a toast
  "Password changed. Please log in again." and redirect to `/login`.

Joi:
- `newPassword` min 8, must contain at least 1 letter + 1 digit.
- `confirmNewPassword === newPassword` (Joi `.valid(Joi.ref("newPassword"))`).
- Rate limit: same strict 5 / 15 min.

### Linked Accounts page

`client/app/profile/linked/page.tsx`:
- Lists Steam, Google, Discord connections.
- Each: show "Connected" + email/username + "Disconnect" button, OR "Connect"
  button (links to existing OAuth start URLs).
- Backend: extend `User` with `providers: { google?: string, discord?: string, steam?: string }`
  if not already present (check OAuth controllers — they likely already store
  provider IDs somewhere).
- DELETE `/api/v1/users/me/providers/:provider` to disconnect. **Reject** if
  it would leave the user with no auth method (no password AND no other
  provider). Return 400 with that exact message.

---

## Phase 5 — Support + legal

### Pages

All under `client/app/profile/support/`:

1. **Help Center** (`/help`) — static FAQ markdown. Sections: "Getting started",
   "Wishlist & deals", "Notifications", "Account & privacy", "Troubleshooting".
   Write 4–6 Q&As per section. Use a collapsible `<details>` element per Q.

2. **Send Feedback** (`/feedback`) — text area + optional email. POSTs to
   `POST /api/v1/support/feedback`. Backend stores in a `feedback` collection
   with `userId`, `text`, `email`, `createdAt`. Rate limit 3 / hour / user.

3. **Report a Bug** (`/bug`) — same as feedback but with extra fields:
   "Steps to reproduce", "Expected behavior", "Browser/device".
   POSTs to `POST /api/v1/support/bug`. Same rate limit.

4. **Privacy Policy** (`/privacy`) — static MDX page. **Required content:**
   - What data is collected (account info, wishlist, OAuth identifiers).
   - Why (deal alerts, recommendations).
   - Third parties (RAWG, ITAD, Cloudinary, Steam, Google, Discord — list each
     with the data shared).
   - User rights (access, export, delete).
   - Cookie usage (auth httpOnly cookie + analytics if any).
   - Contact email.
   - Last updated date.

5. **Terms of Service** (`/terms`) — static MDX. Sections: acceptable use,
   prohibited behavior, account termination, no warranty (the app aggregates
   third-party prices — accuracy not guaranteed), limitation of liability,
   governing law (pick a jurisdiction; default to the user's country), contact.

6. **Export My Data** (`/export`) — button that hits `GET /api/v1/users/me/export`
   returning a JSON blob: profile fields, wishlist, notification prefs.
   Trigger a browser download as `dislow-data-{userId}-{date}.json`.
   Rate limit: 1 / 24h / user.

### Legal pages are NOT optional

The app uses OAuth (Google/Discord) and collects email — Privacy Policy and
ToS are legally required in most jurisdictions before going public. Don't
skip these. Use plain language; don't paste boilerplate from another product.

---

## Phase 6 — Delete Account + add account

### Delete Account

`client/app/profile/delete/page.tsx`:
- Big warning. User types their email to confirm + provides password.
- POST `/api/v1/users/me/delete` — verifies password, then:
  - Delete user from `users`.
  - Delete all `wishlist` entries for that user.
  - Delete all `notifications` for that user.
  - Delete all `feedback` / `bug` entries — OR anonymize (`userId = null`).
    Anonymize is preferred so support reports survive.
  - Clear JWT cookie; client redirects to `/`.
- Rate limit: 3 / day / IP.
- Joi: `confirmEmail === user.email` (strict equality at controller layer).

### Add Account (multi-account switcher)

Out of scope for v1 — defer. Leave the "Log Out" button as the only auth
action in the bottom of the profile page. Re-evaluate after notifications
ship.

---

## Security checklist

Run through this before merging each phase:

- [ ] All routes have Joi validation BEFORE DB queries.
- [ ] `currentPassword` reauth on profile edit, password change, account delete.
- [ ] `bcrypt.compare` with `DUMMY_HASH` fallback when user has no password
      (prevents timing leaks revealing OAuth-only accounts).
- [ ] File uploads: mime whitelist + size limit + re-decode with sharp.
- [ ] Cloudinary URL stored, not local disk paths.
- [ ] Rate limiter on every mutating endpoint (5/15min for sensitive, 3/hour
      for feedback, 1/day for export/delete).
- [ ] Strict equality for confirm fields, not `==`.
- [ ] Notifications endpoint scopes ALL queries by `req.user.id`. NEVER trust
      a `userId` from the request body.
- [ ] Avatar upload returns the new URL — client uses that, doesn't construct
      its own URL from a filename.
- [ ] No `localStorage` for any user data. Already-correct pattern: JWT in
      httpOnly cookie + `AuthContext` fetches `/auth/me` on mount.

---

## Files you will create or modify

### Backend (`src/featchers/`)

```
src/featchers/users/
  User.model.ts                 ← add fields: avatarUrl, following, followers,
                                  notificationPrefs, providers, pendingEmail
  users.service.ts              ← extend
  users.controller.ts           ← extend
  users.routes.ts               ← add /me/* routes

src/featchers/notifications/    ← NEW
  Notification.model.ts
  notifications.service.ts
  notifications.controller.ts
  notifications.routes.ts

src/featchers/support/          ← NEW
  Feedback.model.ts
  Bug.model.ts
  support.service.ts
  support.controller.ts
  support.routes.ts

src/shared/validators/
  profile.schemas.ts            ← NEW: edit profile, change password, delete
  notifications.schemas.ts      ← NEW

server.ts                       ← mount new routers
```

### Frontend (`client/app/`)

```
client/app/profile/
  page.tsx                      ← main profile screen
  edit/page.tsx
  password/page.tsx
  linked/page.tsx
  delete/page.tsx
  support/
    help/page.tsx
    feedback/page.tsx
    bug/page.tsx
    privacy/page.tsx
    terms/page.tsx
    export/page.tsx

client/app/notifications/page.tsx  ← list view

client/components/profile/
  AvatarPicker.tsx
  StatsRow.tsx
  PreferenceToggle.tsx
  AccountSection.tsx
  SupportSection.tsx

client/components/ui/
  NotificationDot.tsx           ← shared (sidebar + header)

client/lib/api/
  users.ts                      ← /me/* endpoints
  notifications.ts              ← NEW
  support.ts                    ← NEW
```

---

## Acceptance criteria per phase

**Phase 1:** Navigate to `/profile`, see avatar (initial letter), name, email,
3 stats with real counts from DB. All "Account" / "Support" rows are clickable
and route to placeholder pages.

**Phase 2:** Click avatar → modal opens with 12 preset tiles + "Upload" tile.
Selecting a preset updates the avatar everywhere (sidebar, header) within
~500 ms. Uploading a 3 MB file is rejected client-side. Uploading a valid
1 MB PNG succeeds and the new URL is a Cloudinary URL.

**Phase 3:** Toggle Discounts off → seed a discount notification via the dev
endpoint → it does NOT appear. Toggle on → seed again → notification appears
on `/notifications`. Sidebar dot is green. Seed an event → dot becomes
split purple/green. Mark all read → dot disappears.

**Phase 4:** Edit Profile without `currentPassword` → 400. With wrong password
→ 401 (constant time vs correct password — measure with `console.time`).
With correct password → success. Change Password → next page load redirects
to `/login`.

**Phase 5:** Submit feedback 4 times in an hour → 4th gets 429. Privacy and
Terms pages render real content, not lorem ipsum. Export returns a JSON file
containing the user's wishlist.

**Phase 6:** Delete account with mismatched email → 400. With correct email +
password → account gone, wishlist gone, notifications gone, feedback rows
have `userId: null`. Login with old credentials → 401.

---

## What NOT to do

- Don't redesign the sidebar — it's shared with the rest of the app.
- Don't introduce a state library (Redux/Zustand/Jotai) just for this page.
  Local `useState` + the existing `AuthContext` covers everything.
- Don't add a real-time notification socket in v1 unless Socket.io is already
  wired. 60s polling is fine.
- Don't store avatars on the server filesystem. Cloudinary only.
- Don't allow setting an empty `avatarUrl`. Reset = pick a preset.
- Don't use `<img>` for avatars without a `loading="lazy"` attribute and a
  fixed `width`/`height` to avoid CLS.
- Don't paste a generic Privacy Policy template — write one that lists the
  actual third-party services this app calls (RAWG, ITAD, Cloudinary, Steam,
  Google, Discord).

---

## Open questions to resolve with the user before starting

Ask before Phase 1 if not already answered:

1. **Avatar gallery contents** — should the 12 presets be game characters
   (licensing risk) or abstract geometric/emoji style? Recommend abstract.
2. **Followers/Following** — placeholder counts only, or build the real
   follow system? Recommend placeholder for now; follow is a separate epic.
3. **Email change confirmation** — instant change after password reauth, or
   require verification of the new email? Recommend verification.
4. **Jurisdiction for Terms** — which country/state for governing law?
5. **Support email** — what address receives "Send Feedback" / "Report a Bug"
   notifications, or is the in-DB record enough?

---

## Estimated effort

- Phase 1: 0.5 day
- Phase 2: 1 day
- Phase 3: 2 days (the big one)
- Phase 4: 1 day
- Phase 5: 0.5 day (legal copy takes longer than the code)
- Phase 6: 0.5 day

**Total:** ~5.5 days of focused work.
