"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { getWishlist, addToWishlist, removeFromWishlist } from "@/lib/api/wishlist"
import { useAuth } from "./AuthContext"
import { toast } from "react-toastify"
import type { WishlistItem } from "@/types/game"

interface WishlistContextType {
  items: WishlistItem[]
  isInWishlist: (gameId: string) => boolean
  toggle: (game: { id: number; name: string; cover: string | null; slug: string }) => Promise<void>
  isLoading: boolean
}

const WishlistContext = createContext<WishlistContextType | null>(null)

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      loadWishlist()
    } else {
      setItems([])
    }
  }, [isAuthenticated])

  const loadWishlist = async () => {
    try {
      setIsLoading(true)
      const data = await getWishlist()
      setItems(data)
    } catch {
      // silent fail
    } finally {
      setIsLoading(false)
    }
  }

  const isInWishlist = (gameId: string) =>
    items.some(item => item.gameId === String(gameId))

  const toggle = async (game: { id: number; name: string; cover: string | null; slug: string }) => {
    if (!isAuthenticated) {
      toast.info("Sign in to save games to your wishlist")
      return
    }

    const gameId = String(game.id)
    const inList = isInWishlist(gameId)

    if (inList) {
      // Optimistic remove
      setItems(prev => prev.filter(i => i.gameId !== gameId))
      try {
        await removeFromWishlist(gameId)
        toast.success(`Removed from wishlist`)
      } catch {
        await loadWishlist()
        toast.error("Failed to update wishlist")
      }
    } else {
      // Optimistic add
      const optimistic: WishlistItem = {
        _id: "temp",
        gameId,
        gameName: game.name,
        gameCover: game.cover,
        gameSlug: game.slug,
        addedAt: new Date().toISOString()
      }
      setItems(prev => [optimistic, ...prev])
      try {
        const newItem = await addToWishlist({
          gameId,
          gameName: game.name,
          gameCover: game.cover,
          gameSlug: game.slug
        })
        setItems(prev => prev.map(i => i._id === "temp" ? newItem : i))
        toast.success(`${game.name} added to wishlist ❤️`)
      } catch {
        await loadWishlist()
        toast.error("Failed to update wishlist")
      }
    }
  }

  return (
    <WishlistContext.Provider value={{ items, isInWishlist, toggle, isLoading }}>
      {children}
    </WishlistContext.Provider>
  )
}

export const useWishlist = () => {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider")
  return ctx
}
