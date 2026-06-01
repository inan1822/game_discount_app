"use client"

import { Provider } from "react-redux"
import { store } from "./store"

// Client-side wrapper so the server-component root layout can mount the store.
export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>
}
