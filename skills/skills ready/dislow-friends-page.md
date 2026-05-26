# DisLow Friends Page — Implementation Skill

A complete spec for building the `/friends` page and friends system in the
DisLow gaming app. Read this top-to-bottom before writing any code. Implement
in phases — do NOT try to ship everything in one PR.

---

## Context

**App:** DisLow — mobile-first game deal finder.
**Stack:** Next.js 16 App Router + React 19 + Tailwind 4 (client) ·
Express 5 + TypeScript + MongoDB/Mongoose (server) · JWT in httpOnly cookies ·
bcrypt rounds=12 · Joi validation · helmet + hpp + express-rate-limit.

**Repo root:** `C:\FULLSTACK\lessons\AI Figma\gaming-app`
**Friends page lives at:** `client/app/friends/page.tsx` (create if missing).
**Friend profile lives at:** `client/app/friends/[id]/page.tsx`.
**Entry points:** Friends nav item in desktop `<Sidebar>` (SOCIAL section)
and the mobile side drawer. Both already exist — just wire the route.

**Reference design:** a Figma mockup exists showing 4 tabs and a list with
online/offline grouping. DO NOT copy pixel-perfect — match the live `/profile`
and `/game/[id]` pages instead. The reference is a structural guide only.

---

## Visual Reference

```
┌────────────────────────────────────────────────────────────────┐
│ Sidebar     │  Friends                                          │
│  Home       │  ┌──────────┬──────────┬──────────┬───────────┐  │
│  Notif.     │  │Following │Followers │ Requests │Add Friend │  │
│  Search     │  └──────────┴──────────┴──────────┴───────────┘  │
│  ─SOCIAL─   │                                                   │
│  Friends ●  │  🔍  Search friends...                            │
│  Profile    │                                                   │
│             │  Online — 3                                       │
│             │  ┌─────────────────────────────────────────────┐  │
│             │  │ (A) Alex_G                                  │  │
│             │  │     14 shared games · 6 shared friends      │  │
│             │  │                          [Message] [×]      │  │
│             │  └─────────────────────────────────────────────┘  │
│             │  ┌─────────────────────────────────────────────┐  │
│             │  │ (M) MariaStar                               │  │
│             │  │     8 shared games · 3 shared friends       │  │
│             │  └─────────────────────────────────────────────┘  │
│             │                                                   │
│             │  Offline — 3                                      │
│             │  ┌─────────────────────────────────────────────┐  │
│             │  │ (S) Sam_0x                                  │  │
│             │  │     5 shared games · 2 shared friends       │  │
│             │  └─────────────────────────────────────────────┘  │
│             │                                                   │
└────────────────────────────────────────────────────────────────┘
```

**Active tab:** brand-blue `#6475D1` background at 20% opacity, full-color
text, Semi Bold. No underline. Inactive tabs: `text-white/45`, Regular weight.

**Card style:** `rgba(28,30,42,0.70)` background, `1px solid rgba(255,255,255,0.05)`
border, `rounded-[14px]`, `backdrop-blur(8px)`. Same tokens as DiscountRow
and the Profile cards. Do not invent new tokens.

**Online indicator:** small `#44d62c` dot on the avatar's bottom-right
(absolute-positioned, 10px circle, 2px solid `--bg-primary` border).

**Avatar:** 44px circle. If `user.avatarUrl` exists use it, otherwise render
a gradient background with the first letter — same logic as the Profile page.

---

## Implementation Phases

Ship in this order. Each phase is independently mergeable.

### Phase 1 — Data model + Following/Followers list (read-only)
### Phase 2 — Follow / Unfollow + Requests system
### Phase 3 — Add Friend search
### Phase 4 — In-page friend search bar + online/offline split
### Phase 5 — Friend profile page (`/friends/[id]`)
### Phase 6 — Polish: optimistic UI, error toasts, empty states

---

## Phase 1 — Data model + list endpoints

### Backend

**Schema additions** — most should ALREADY exist on `User.model.ts` from the
profile work. Verify and extend:

```ts
following:    [{ type: ObjectId, ref: "User", default: [] }],   // users I follow
followers:    [{ type: ObjectId, ref: "User", default: [] }],   // users following me
followRequests: {
  incoming: [{ type: ObjectId, ref: "User", default: [] }],     // people who asked to follow me
  outgoing: [{ type: ObjectId, ref: "User", default: [] }],     // people I asked to follow
},
isPrivate:    { type: Boolean, default: false },
lastSeenAt:   { type: Date, default: Date.now },                // for online/offline
```

**Online detection:** treat a user as "online" if `lastSeenAt > now - 2min`.
Update `lastSeenAt` on the existing `authMiddleware` (cheap — one `updateOne`
with `$set`, no `await` needed if you want fire-and-forget). Add a sparse
index on `lastSeenAt` if you plan to query globally.

**Endpoints (this phase):**

```
GET /api/v1/users/me/following    → User[] (subset of fields)
GET /api/v1/users/me/followers    → User[]
```

Return shape per user:

```ts
{
  _id: string,
  displayName: string,
  avatarUrl: string | null,
  isOnline: boolean,
  sharedGamesCount: number,    // intersection of wishlists
  sharedFriendsCount: number,  // intersection of followings
}
```

**Computing `sharedGamesCount`:**
- One aggregation per list response — do NOT do N+1 queries.
- For each friend in the list, the shared count =
  `|wishlist(me) ∩ wishlist(friend)|`. Use a single `$lookup` + `$setIntersection`
  pipeline keyed on `gameId`.

**Computing `sharedFriendsCount`:** intersection of my `following` array with
their `following` array. Cheap — just `_.intersection(myFollowing, theirFollowing).length`
in JS since both are already loaded.

Both endpoints `requireAuth`. Standard rate limiter (no special tightening).

### Frontend

Create `client/app/friends/page.tsx`. Use the existing `<Sidebar>` with
`activeNav="Friends"`. Reuse the layout pattern from `client/app/profile/page.tsx`:

- Page wrapper: `relative w-screen h-screen overflow-hidden` + `BackgroundGradientAnimation`.
- Right column scrolls; sidebar fixed.
- `useAuth()` to gate the page — redirect to `/login` if `!user`.

**Tab bar component** `<FriendsTabs>`:
- Tabs: `Following | Followers | Requests | Add Friend`.
- Controlled via URL search param `?tab=following` (default `following`).
- Use `next/navigation` `useSearchParams` + `router.replace` to update without
  full reload — preserves scroll position.
- Active tab: `bg-[#6475D1]/20 text-[#6475D1] font-semibold`.
- Inactive: `text-white/45 hover:text-white/70`.
- No underline. Wrapped in a single `<div>` with `rounded-[14px]` and the
  standard card background.

**Following / Followers panels** (Phase 1 just shows lists, no buttons yet):
- Render a list of `<FriendRow>` cards.
- Group by `isOnline` — show `Online — {n}` header (in `#44d62c`), then the
  group, then `Offline — {n}` header (in `text-white/45`), then that group.
- Skeleton loader while fetching: 6 shimmer rows.

**`<FriendRow>` component:**
- Left: avatar (44px) with online dot if `isOnline`.
- Middle: display name (bold white) + meta line `{sharedGamesCount} shared games · {sharedFriendsCount} shared friends`.
- Right: action slot (empty in Phase 1).
- Entire row is `<Link href={`/friends/${user._id}`}>` — Phase 5 builds that page.

---

## Phase 2 — Follow / Unfollow + Requests system

### Backend

**Endpoints:**

```
POST   /api/v1/users/:id/follow                → send request OR follow directly
DELETE /api/v1/users/:id/follow                → unfollow (or cancel outgoing request)
GET    /api/v1/users/me/requests               → { incoming: User[], outgoing: User[] }
POST   /api/v1/users/requests/:id/accept       → accept an incoming request
DELETE /api/v1/users/requests/:id/decline      → decline an incoming request
```

**`POST /:id/follow` logic** (the critical one):

```
Let me = req.user, target = User.findById(:id).
1. Reject if me._id === target._id  (400 "cannot follow yourself")
2. Reject if me.following includes target._id  (409 "already following")
3. If target.isPrivate:
     - If target.followRequests.incoming includes me._id → 409 "request pending"
     - Push me._id onto target.followRequests.incoming
     - Push target._id onto me.followRequests.outgoing
     - Return { status: "requested" }
4. Else (public):
     - Push target._id onto me.following
     - Push me._id   onto target.followers
     - Return { status: "following" }
```

**`DELETE /:id/follow` logic** handles BOTH unfollow and cancel-request:
- Pull from `me.following` + `target.followers` if currently following.
- Pull from `me.followRequests.outgoing` + `target.followRequests.incoming` if pending.
- Idempotent — return 204 even if nothing was there. Don't 404.

**`POST /requests/:id/accept`:**
- `:id` is the REQUESTER's user id, not a separate request document.
- Verify `me.followRequests.incoming` actually contains `:id`. If not, 404.
- Atomic: pull from `me.followRequests.incoming`, push onto `me.followers`,
  pull from `requester.followRequests.outgoing`, push onto `requester.following`.
- Use a Mongoose session/transaction. The follow graph MUST stay consistent —
  do not allow a partial state where me.followers includes them but their
  following doesn't include me.

**`DELETE /requests/:id/decline`:**
- Pull `:id` from `me.followRequests.incoming` and `me._id` from
  `requester.followRequests.outgoing`. Idempotent.

**Rate limit:** 30/hour per IP on `POST /:id/follow` and `POST /requests/:id/accept`
(prevents spam-follow / spam-accept). Other routes use the standard limiter.

**Joi:** validate `:id` is a valid `ObjectId` string on every route. Use
`Joi.string().hex().length(24)` — reject anything else with 400 BEFORE the DB
query. This prevents `CastError` paths and reflection-style probes.

**Security non-negotiables:**
- EVERY mutation is scoped by `req.user.id`. NEVER read a `userId` from the
  request body or query.
- The follow / unfollow endpoints must NOT leak `target.isPrivate` to
  non-followers — return the same response shape whether or not the target
  is private. Distinguish only via the `status` field returned to the actor.
- A user CANNOT see another user's `followRequests.incoming` or `outgoing` —
  these are only ever queried by the owner.

### Frontend

**Following tab — add action:**
- Each row gets a `[Message]` and `[×]` button on the right (mobile: just `[×]`).
- `[×]` triggers `DELETE /users/:id/follow`. Optimistic remove from list.
- `[Message]` is a stub for now — wire to nothing or open a "Coming soon" toast.

**Followers tab — add action:**
- If the follower is also in `me.following`, show `[Friends]` (disabled pill).
- Else show `[Follow Back]` → `POST /users/:id/follow`.

**Requests tab:**
- Two sub-sections: `Incoming` and `Outgoing` (collapse if empty).
- Incoming row: avatar + name + `[Accept]` `[Decline]`.
- Outgoing row: avatar + name + `[Cancel Request]` (calls `DELETE /:id/follow`).
- Numeric badge on the Requests tab label when `incoming.length > 0` — use
  the same blue (`#6475D1`) pill as Profile's stats numbers.

**API client** — extend `client/lib/api/users.ts`:

```ts
listFollowing()
listFollowers()
listRequests()
follow(id)
unfollow(id)
acceptRequest(requesterId)
declineRequest(requesterId)
```

All return typed responses. Reuse the existing Axios instance — it already
handles the JWT cookie and the 401 redirect interceptor.

---

## Phase 3 — Add Friend search

### Backend

```
GET /api/v1/users/search?q=...&limit=20    → User[] (minimal shape)
```

**Query rules:**
- `q` is REQUIRED. Reject `< 2` chars with 400.
- Case-insensitive prefix match on `displayName` AND `email` (regex anchored
  with `^`, escape regex special chars first — use a small `escapeRegExp` helper).
- EXCLUDE `req.user.id` from results.
- Cap `limit` at 50 server-side regardless of what the client sends.
- Strip sensitive fields before returning. NEVER return `email` of other users
  if the searcher matched on a name — only return matched-by-email results
  when the query LOOKS LIKE an email (contains `@`). Even then, the response
  should NOT include the matched email; just `displayName` + `avatarUrl` +
  `_id` + a `relationship` field (see below).

**`relationship` field** per result:
- `"following"`   — me follows them.
- `"requested"`   — me sent a request, pending.
- `"follows-me"` — they follow me but I don't follow them.
- `"none"`        — neither.

This lets the UI pick the right button label without a second round-trip.

**Rate limit:** 60/min per IP. Search is hammered by the autocomplete UX so
the limit should be looser than mutations but still bounded.

**Indexes:** `db.users.createIndex({ displayName: 1 })` (collation `{ strength: 2 }`
for case-insensitive). Without this, the regex query is a full collection scan.

### Frontend

**Add Friend tab UI:**
- Big rounded search input at the top: `Look for my friend...`.
- Debounce 250ms before firing the request. Cancel in-flight on new input
  (Axios `AbortController`).
- Empty state when `q.length < 2`: "Type at least 2 characters to search."
- Results list: `<FriendRow>` variant with an action button driven by
  `relationship`:
  - `none`        → `[Follow]` or `[Request]` depending on hovered tooltip
                    (the API also returns a `isPrivate` hint — show `[Request]`).
  - `requested`   → `[Requested]` (disabled, gray).
  - `following`   → `[Following]` (disabled, gray).
  - `follows-me`  → `[Follow Back]`.

After a successful follow, update the button state in place (no full refetch).

---

## Phase 4 — In-page friend search bar + online/offline split

The screenshot in the brief shows a search input BELOW the tab bar, used to
filter the CURRENT tab's list. This is separate from the Add Friend search
(which queries the whole user base).

### Frontend only — no new backend endpoint

- Add a search input below the tab bar on the Following, Followers, and
  Requests tabs.
- It filters the already-loaded list client-side by `displayName` (case
  insensitive `includes`). Don't hit the server — these lists are small
  (a user's own social graph).
- Persist filter text in component state, NOT in the URL — clearing the
  tab should clear the filter.

**Online / Offline split** (already specified in Phase 1, but here are the
exact rules):

- `Online — {n}` group shown first when `n > 0`.
- `Offline — {n}` shown second when `n > 0`.
- If either group is empty, hide its header.
- Within each group, sort by `displayName` ascending.

---

## Phase 5 — Friend profile page (`/friends/[id]`)

### Backend

```
GET /api/v1/users/:id/profile     → public profile view
```

Response shape:

```ts
{
  _id, displayName, avatarUrl, isPrivate, isOnline,
  followingCount, followersCount,
  sharedFriendsCount, sharedGamesCount,
  relationship: "self" | "following" | "requested" | "follows-me" | "none",
  favorites: WishlistItem[] | null,    // null if isPrivate and !following
}
```

**Privacy rules:**
- If `target.isPrivate === true` AND `relationship !== "following"`:
  return the profile WITHOUT `favorites` (set it to `null`).
- Always return `followingCount` / `followersCount` even for private
  accounts — those are not sensitive.
- If `:id === req.user.id`, return `relationship: "self"` and let the
  client redirect to `/profile`.

### Frontend

`client/app/friends/[id]/page.tsx`:

- Top section mirrors the `/profile` layout: red→purple banner background,
  large avatar (centered), display name, "X shared friends · Y shared favorites"
  subtitle line.
- Action row under the name:
  - `relationship === "following"` → `[Unfollow]` + `[Message]`.
  - `requested`                    → `[Cancel Request]`.
  - `follows-me`                   → `[Follow Back]` + `[Message]`.
  - `none`                         → `[Follow]` (or `[Request]` if private).
- Stats row: `Following | Followers` (2 columns, same component as `/profile`).
- "Their favorites" section:
  - If `favorites === null` (private + not following): show a lock icon and
    "This account is private. Follow to see their games."
  - Else: grid of GameCards reusing the existing `<GameCard>` component.

**Don't add a follow/unfollow optimistic flicker** — show a spinner on the
button during the request, then swap the label.

**Empty/error handling:**
- 404 from backend → render a "User not found" state. Don't crash.
- 401 → AuthContext interceptor already redirects; do nothing extra.

---

## Phase 6 — Polish

- **Optimistic updates:** for unfollow, accept, decline — remove the row
  immediately; on error, re-insert and toast "Couldn't update. Try again."
- **Empty states:** every tab gets a friendly illustration + line of copy:
  - Following empty: "You're not following anyone yet. Try the Add Friend tab."
  - Followers empty: "No followers yet. Share your profile to get started."
  - Requests empty: "No pending requests."
- **Skeleton loaders:** 6 shimmer rows while lists are loading.
- **Mobile layout:** the tab bar is horizontally scrollable on screens
  `< 480px`. Don't shrink the labels.
- **Accessibility:** every action button has an `aria-label`. The `[×]`
  remove button needs `aria-label="Unfollow {displayName}"`.

---

## Security checklist

Run through this before merging each phase:

- [ ] All routes have Joi validation BEFORE DB queries.
- [ ] `:id` params validated as ObjectId hex strings (24 chars).
- [ ] Every mutation scoped by `req.user.id`. NEVER trust a `userId` from
      request body or query.
- [ ] User search never returns other users' emails (only `displayName` +
      `avatarUrl` + `_id` + `relationship`).
- [ ] Private accounts' `favorites` are hidden from non-followers.
- [ ] Private accounts' `followRequests` (incoming + outgoing) are NEVER
      exposed to anyone except the owner.
- [ ] `POST /:id/follow` and `POST /requests/:id/accept` are rate-limited
      to 30/hour per IP. User search is 60/min.
- [ ] Accept-request flow uses a Mongoose session — no partial follow-graph
      state allowed.
- [ ] Idempotent unfollow / decline — return 204 even when nothing changes.
      Do NOT 404 (prevents existence-probing of relationships).
- [ ] Cannot follow yourself — 400 short-circuit.
- [ ] `lastSeenAt` is updated server-side only, NEVER from a client header.

---

## Files you will create or modify

### Backend (`src/featchers/`)

```
src/featchers/users/
  User.model.ts                 ← verify/add: following, followers,
                                  followRequests.{incoming,outgoing},
                                  isPrivate, lastSeenAt
  users.service.ts              ← extend: listFollowing/Followers,
                                  follow/unfollow, accept/decline,
                                  search, getPublicProfile
  users.controller.ts           ← extend handlers
  users.routes.ts               ← add /me/following, /me/followers,
                                  /me/requests, /:id/follow,
                                  /requests/:id/accept|decline,
                                  /search, /:id/profile

src/shared/validators/
  friends.schemas.ts            ← NEW: ObjectId param schemas + search query

src/shared/middleware/
  authMiddleware.ts             ← extend to fire-and-forget update lastSeenAt
```

### Frontend (`client/app/`)

```
client/app/friends/
  page.tsx                      ← tab container + URL param state
  [id]/page.tsx                 ← friend profile

client/components/friends/
  FriendsTabs.tsx
  FriendRow.tsx                 ← used by all 4 tabs, action slot via prop
  FollowingPanel.tsx
  FollowersPanel.tsx
  RequestsPanel.tsx             ← incoming + outgoing sub-sections
  AddFriendPanel.tsx            ← debounced search
  OnlineDot.tsx
  FriendSearchBar.tsx           ← in-page filter (separate from Add)

client/lib/api/
  users.ts                      ← extend: listFollowing, listFollowers,
                                  listRequests, follow, unfollow,
                                  acceptRequest, declineRequest,
                                  searchUsers, getFriendProfile

client/types/
  user.ts                       ← add: FriendListItem, FollowRequest,
                                  FriendProfile, Relationship
```

---

## Acceptance criteria per phase

**Phase 1:** Navigate to `/friends`. Tab bar renders 4 tabs, Following is
active by default. Lists fetch and display rows with online/offline split.
Empty lists show a friendly empty state. No buttons work yet.

**Phase 2:** From Following tab, click `[×]` on a row → row disappears,
backend `me.following` no longer contains them. From Requests tab,
`[Accept]` moves the user from Incoming to Followers. `[Decline]` removes.
Try to follow a private account → request goes to Outgoing instead of
Following. Try to follow yourself → 400.

**Phase 3:** Open Add Friend tab. Type 1 char → no request fires. Type
2+ chars → debounced request fires. Each result shows the correct button
based on `relationship`. Clicking `[Follow]` updates the button in place
to `[Following]` without a re-search.

**Phase 4:** In-page search input filters the visible list. Online/offline
headers hide when their group is empty. Tab switch clears the filter.

**Phase 5:** Click a friend row → `/friends/[id]` renders their profile.
Public account shows favorites grid. Private account I don't follow shows
locked state. Private account I follow shows favorites. Self-link redirects
to `/profile`.

**Phase 6:** Disconnect network → unfollow click reverts and toasts the
error. Reconnect → retry works. All empty states render correctly. Mobile
horizontal scroll works on the tab bar.

---

## What NOT to do

- Don't redesign the sidebar — Friends is already wired in.
- Don't introduce a state library. `useState` + the existing `AuthContext`
  covers everything. If you find yourself reaching for Zustand, stop and
  re-read the component tree.
- Don't store the follow graph as a separate `Follows` collection unless
  you can justify it. Arrays on `User` are fine at this scale (low
  thousands of follows per user). If it becomes a problem later, migrate.
- Don't 404 on unfollow when not following — it leaks relationship
  existence. Always 204.
- Don't trust `:id` is well-formed — Joi-validate every `ObjectId` param.
- Don't return other users' emails from the search endpoint.
- Don't render online status client-side from `lastSeenAt` — the backend
  computes the boolean. Client just trusts `isOnline`.
- Don't use websockets for online presence in v1. The 2-min `lastSeenAt`
  heuristic is good enough and free.
- Don't poll `/me/following` on a timer — fetch on mount and on tab visibility
  (`document.visibilitychange`) and trust the optimistic updates between.

---

## Open questions to resolve with the user before starting

Ask before Phase 1 if not already answered:

1. **Public vs private accounts** — does `isPrivate` already exist on User
   from the profile work? If yes, reuse. If not, add it in Phase 1.
2. **Messaging** — `[Message]` button is shown in the design. Is in-app
   messaging in scope, or is it a stub for v2? Recommend stub.
3. **Online status TTL** — 2 minutes since `lastSeenAt` is the recommended
   default. Confirm or override.
4. **Shared games definition** — intersection of WISHLISTS (recommended) or
   intersection of favorites/followed games? They may be the same model
   depending on what was built in the profile epic — confirm.
5. **Search by email** — should the Add Friend search match emails at all,
   or only display names? Recommend only display names by default (avoids
   email-existence probing). If yes to emails, then ONLY when the query
   contains `@` and ONLY return the user; never echo the matched email back.
6. **Block list** — out of scope for v1? Recommend yes, defer. Add a TODO.

---

## Estimated effort

- Phase 1: 1 day (schema verification + 2 list endpoints + UI shell)
- Phase 2: 1.5 days (follow graph correctness is the tricky part)
- Phase 3: 0.5 day
- Phase 4: 0.25 day
- Phase 5: 1 day (privacy logic + reusing GameCard grid)
- Phase 6: 0.5 day

**Total:** ~4.75 days of focused work.
