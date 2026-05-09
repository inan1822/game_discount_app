import api from "./axios"
import type { WishlistItem } from "@/types/game"

export const getWishlist = async (): Promise<WishlistItem[]> => {
  const { data } = await api.get("/wishlist")
  return data.data
}

export const addToWishlist = async (game: {
  gameId: string
  gameName: string
  gameCover: string | null
  gameSlug: string
}): Promise<WishlistItem> => {
  const { data } = await api.post("/wishlist", game)
  return data.data
}

export const removeFromWishlist = async (gameId: string): Promise<void> => {
  await api.delete(`/wishlist/${gameId}`)
}

export const checkWishlist = async (gameId: string): Promise<boolean> => {
  const { data } = await api.get(`/wishlist/${gameId}`)
  return data.data.inWishlist
}
