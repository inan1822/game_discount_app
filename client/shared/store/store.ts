import { configureStore } from "@reduxjs/toolkit"
import wishlistReducer from "@/features/wishlist/slices/wishlistSlice"

// Centralized Redux store ("Single Source of Truth").
// Wishlist global state lives here; other slices can be added the same way.
export const store = configureStore({
  reducer: {
    wishlist: wishlistReducer,
  },
})

export type RootState   = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
