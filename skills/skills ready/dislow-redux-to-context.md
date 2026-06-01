---
name: dislow-redux-to-context
description: >
  Removes Redux (@reduxjs/toolkit + react-redux) from the DisLow storefront (client/)
  and consolidates wishlist state into a WishlistContext that matches the existing
  AuthContext pattern. Use this skill whenever the user wants to: remove Redux,
  simplify state management, migrate to Context API, or asks why the app uses both
  Redux and Context. Also trigger on: "remove Redux", "too much state management",
  "consolidate wishlist", "WishlistContext", or "react-redux is not needed".
  This skill reduces the client bundle by ~6.6 MB and eliminates the dual state layer.
---

# DisLow — Redux → WishlistContext Migration

You are removing the Redux layer from `client/` and consolidating wishlist state
into a React Context that follows the same pattern as `AuthContext`.

Work through the phases in order. Read each file before editing it.

---

## Phase 1 — Understand what exists

Read these files to understand the current state shape before writing anything:

1. `client/features/wishlist/slices/wishlistSlice.ts` — current Redux state shape
2. `client/shared/store/store.ts` — Redux store setup
3. `client/shared/store/hooks.ts` — typed `useAppSelector` / `useAppDispatch`
4. `client/shared/store/ReduxProvider.tsx` — the provider wrapping the app
5. `client/app/(app)/favourites/page.tsx` — primary Redux consumer
6. `client/app/layout.tsx` — where ReduxProvider is mounted
7. `client/features/auth/state/AuthContext.tsx` — use this as the pattern for your new context

Also grep for any other Redux consumers:
```
grep -r "useSelector\|useDispatch\|useAppSelector\|useAppDispatch" client/app client/components client/features
```

---

## Phase 2 — Create WishlistContext

Create `client/features/wishlist/state/WishlistContext.tsx`.

Model it exactly on `AuthContext.tsx` — same file structure, same hook export pattern.

The context must expose:
```ts
interface WishlistContextValue {
  wishlistIds: Set<string>           // IDs of games in the wishlist
  isInWishlist: (gameId: string) => boolean
  addToWishlist: (item: WishlistPayload) => Promise<void>
  removeFromWishlist: (gameId: string) => Promise<void>
  toggleWishlist: (e: React.MouseEvent, game: Game) => Promise<void>
  refresh: () => Promise<void>       // re-fetch from server
  loading: boolean
}
```

Where `WishlistPayload` is:
```ts
interface WishlistPayload {
  gameId: string
  gameName: string
  gameCover: string | null
  gameSlug: string
}
```

The provider should:
- On mount, call `getWishlist()` from `client/features/wishlist/services/wishlist.ts`
- Populate `wishlistIds` as a `Set<string>` of the returned game IDs
- Re-fetch when the auth user changes (listen to `useAuth()`)
- Export a `useWishlist()` hook that throws a helpful error if used outside the provider

---

## Phase 3 — Migrate consumers

For each file that uses `useAppSelector` / `useAppDispatch` / `useSelector`:

1. Remove the Redux import
2. Replace with `const { wishlistIds, toggleWishlist, ... } = useWishlist()`
3. Adjust the logic to match the new API

The `favourites/page.tsx` is the main consumer. It likely:
- Reads `wishlistIds` from Redux state
- Dispatches add/remove actions

After migration it should read from `useWishlist()` instead.

The home page (`client/app/(app)/page.tsx`) manages its own local `wishlistIds` state for
performance (to avoid re-renders across all game cards on every toggle). You can leave its
local state management as-is — just remove any Redux imports it has and confirm it's using
the wishlist service functions directly (which it likely already does).

---

## Phase 4 — Wire the provider

In `client/app/layout.tsx`:

1. Remove `<ReduxProvider>` (or the equivalent wrapper)
2. Add `<WishlistProvider>` **inside** `<AuthProvider>` because WishlistContext
   depends on `useAuth()` to know when to re-fetch:

```tsx
<AuthProvider>
  <WishlistProvider>
    {children}
  </WishlistProvider>
</AuthProvider>
```

---

## Phase 5 — Delete the Redux layer

Only do this after Phase 3 is confirmed working.

Delete these files/directories:
- `client/shared/store/` (entire directory: store.ts, hooks.ts, ReduxProvider.tsx)
- `client/features/wishlist/slices/wishlistSlice.ts`

Remove from `client/package.json`:
- `@reduxjs/toolkit`
- `react-redux`

Run `pnpm install` in `client/` to apply.

---

## Rules

- Never delete a file until all its consumers are migrated.
- Keep optimistic UI updates — when the user clicks the star, update the local Set
  immediately, then call the API, then revert on failure. The current Redux approach
  likely does this; preserve it.
- The `toggleWishlist` function signature should be `(e: React.MouseEvent, game: Game) => Promise<void>`
  so it works as a drop-in for the existing `onToggleFavorite` prop passed to GameCard.
- After Phase 5, run `pnpm build` in `client/` to confirm zero Redux references remain.

---

## Done when

- `grep -r "react-redux\|@reduxjs" client/app client/components client/features client/shared` returns nothing
- `client/shared/store/` directory no longer exists
- `pnpm build` in `client/` passes
- Wishlist star toggle still works on the home page, game detail page, and favourites page
- Favourites page still loads and displays saved games
