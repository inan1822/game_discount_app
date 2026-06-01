import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"
import {
  getWishlist,
  addToWishlist as apiAdd,
  removeFromWishlist as apiRemove,
} from "@/features/wishlist/services/wishlist"
import type { WishlistItem } from "@/shared/types/game"

// ─── State ──────────────────────────────────────────────────────────────────
interface WishlistState {
  items:   WishlistItem[]
  loading: boolean
}

const initialState: WishlistState = {
  items:   [],
  loading: false,
}

// ─── Async thunks (call the existing lib/api/wishlist.ts service) ─────────────

export const fetchWishlist = createAsyncThunk(
  "wishlist/fetch",
  async () => {
    return await getWishlist()
  },
)

// Add a game — returns the saved item from the API (with real _id)
export const addWishlistItem = createAsyncThunk(
  "wishlist/add",
  async (game: { gameId: string; gameName: string; gameCover: string | null; gameSlug: string }) => {
    return await apiAdd(game)
  },
)

export const removeWishlistItem = createAsyncThunk(
  "wishlist/remove",
  async (gameId: string) => {
    await apiRemove(gameId)
    return gameId
  },
)

// ─── Slice ──────────────────────────────────────────────────────────────────

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    // Clear on logout
    clearWishlist: (state) => {
      state.items = []
    },
  },
  extraReducers: (builder) => {
    builder
      // fetch
      .addCase(fetchWishlist.pending,   (state) => { state.loading = true })
      .addCase(fetchWishlist.fulfilled, (state, action: PayloadAction<WishlistItem[]>) => {
        state.items   = action.payload
        state.loading = false
      })
      .addCase(fetchWishlist.rejected,  (state) => {
        state.items   = []
        state.loading = false
      })
      // add — prepend on success (newest first)
      .addCase(addWishlistItem.fulfilled, (state, action: PayloadAction<WishlistItem>) => {
        if (!state.items.some(i => String(i.gameId) === String(action.payload.gameId))) {
          state.items.unshift(action.payload)
        }
      })
      // remove
      .addCase(removeWishlistItem.fulfilled, (state, action: PayloadAction<string>) => {
        state.items = state.items.filter(i => String(i.gameId) !== String(action.payload))
      })
  },
})

export const { clearWishlist } = wishlistSlice.actions
export default wishlistSlice.reducer
