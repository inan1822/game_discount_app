import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"
import {
  getWishlist,
  addToWishlist as apiAdd,
  removeFromWishlist as apiRemove,
  type WishlistItemDTO,
} from "@/lib/api/wishlist"

// ─── State ──────────────────────────────────────────────────────────────────
interface WishlistState {
  items:   WishlistItemDTO[]
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

export const addWishlistItem = createAsyncThunk(
  "wishlist/add",
  async (item: WishlistItemDTO) => {
    await apiAdd(item)
    return item
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
      .addCase(fetchWishlist.fulfilled, (state, action: PayloadAction<WishlistItemDTO[]>) => {
        state.items   = action.payload
        state.loading = false
      })
      .addCase(fetchWishlist.rejected,  (state) => {
        state.items   = []
        state.loading = false
      })
      // add (optimistic-friendly — append on success)
      .addCase(addWishlistItem.fulfilled, (state, action: PayloadAction<WishlistItemDTO>) => {
        if (!state.items.some(i => String(i.gameId) === String(action.payload.gameId))) {
          state.items.push(action.payload)
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
