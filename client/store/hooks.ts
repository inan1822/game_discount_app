import { useDispatch, useSelector } from "react-redux"
import type { RootState, AppDispatch } from "./store"

// Typed versions of the React-Redux hooks — use these everywhere instead of
// the plain useDispatch/useSelector so state/dispatch are fully typed.
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
