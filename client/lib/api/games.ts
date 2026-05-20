import api from "./axios"
import type { Game, GiveawayItem, GameEvent } from "@/types/game"

export const searchGames = async (q: string, page = 1): Promise<Game[]> => {
  const { data } = await api.get("/games/search", { params: { q, page } })
  return data.data
}

export const getGameById = async (id: string): Promise<Game> => {
  const { data } = await api.get(`/games/${id}`)
  return data.data
}

/** Popular — games with the biggest communities (most added to user libraries) */
export const getPopularGames = async (page = 1): Promise<Game[]> => {
  const { data } = await api.get("/games/popular", { params: { page } })
  return data.data
}

/** New — games released in the last 12 months */
export const getNewGames = async (page = 1): Promise<Game[]> => {
  const { data } = await api.get("/games/new", { params: { page } })
  return data.data
}

/** Trended — games from last 3 years sorted by community traction */
export const getTrendedGames = async (page = 1): Promise<Game[]> => {
  const { data } = await api.get("/games/trended", { params: { page } })
  return data.data
}

/** For You — personalised recommendations based on wishlist genres (auth required) */
export const getForYouGames = async (): Promise<Game[]> => {
  const { data } = await api.get("/games/for-you")
  return data.data
}

/** Price — cheapest single price for home-page cards. null = not found → show Unknown */
export const getGamePrice = async (title: string): Promise<string | null> => {
  try {
    const { data } = await api.get("/games/price", { params: { title } })
    // backend returns { price: string } or { price: null }
    return data.data?.price ?? null
  } catch {
    return null
  }
}

/**
 * Deals — all store deals for the game detail page.
 * Passes steamAppId when available → backend uses ITAD for exact matching.
 * Falls back to CheapShark title search (exact → prefix → acronym → Fuse.js).
 */
export const getGameDeals = async (
  title: string,
  steamAppId?: string,
): Promise<import("@/types/game").PriceResult[]> => {
  try {
    const params: Record<string, string> = { title }
    if (steamAppId) params.steamAppId = steamAppId
    const { data } = await api.get("/games/deals", { params })
    return data.data ?? []
  } catch {
    return []
  }
}

/**
 * DLC Deals — store discounts for every DLC of the given base game.
 * Requires a Steam AppID (DLC list comes from Steam appdetails).
 * Returns empty array when the game has no DLC or no DLC pricing.
 */
export const getGameDlcDeals = async (
  steamAppId: string,
): Promise<import("@/types/game").PriceResult[]> => {
  try {
    const { data } = await api.get("/games/dlc-deals", { params: { steamAppId } })
    return data.data ?? []
  } catch {
    return []
  }
}

/** Free to Play */
export const getFreeToPlayGames = async (): Promise<Game[]> => {
  const { data } = await api.get("/games/free-to-play")
  return data.data ?? []
}

/** Hidden Gems */
export const getHiddenGemsGames = async (): Promise<Game[]> => {
  const { data } = await api.get("/games/hidden-gems")
  return data.data ?? []
}

/** Deal of the Day */
export interface DealOfDay {
  title:       string
  cover:       string | null
  salePrice:   string
  normalPrice: string
  savings:     number
  storeName:   string
  storeIcon:   string
  dealLink:    string
  gameId:      number | null
}
export const getDealOfDay = async (): Promise<DealOfDay | null> => {
  try {
    const { data } = await api.get("/games/deal-of-day")
    return data.data ?? null
  } catch {
    return null
  }
}

/** By Genre */
export const getByGenreGames = async (genre: string, page = 1): Promise<Game[]> => {
  const { data } = await api.get("/games/by-genre", { params: { genre, page } })
  return data.data ?? []
}

/**
 * Batch price fetch — POST /games/batch-prices
 * Requires: user must be logged in (httpOnly cookie sent automatically via withCredentials).
 * Fetches prices for up to 20 game titles in a single round-trip.
 * Returns a map of { title → price | null }.
 */
export const batchGetPrices = async (
  titles: string[],
): Promise<Record<string, string | null>> => {
  if (titles.length === 0) return {}
  try {
    const { data } = await api.post("/games/batch-prices", { titles })
    return data.data ?? {}
  } catch {
    return {}
  }
}

/**
 * Game Events — Steam news/events feed for a specific game.
 * Requires the game's Steam AppID. Returns [] for non-Steam games.
 * No auth required — uses the free public Steam ISteamNews API.
 */
export const getGameEvents = async (steamAppId: string): Promise<GameEvent[]> => {
  try {
    const { data } = await api.get("/games/events", { params: { steamAppId } })
    return data.data ?? []
  } catch {
    return []
  }
}

/**
 * Giveaways — GamerPower free game giveaways matching the given title.
 * Returns up to 3 active giveaways (keys / free-to-claim offers).
 */
export const getGameGiveaways = async (title: string): Promise<GiveawayItem[]> => {
  try {
    const { data } = await api.get("/games/giveaways", { params: { title } })
    return data.data ?? []
  } catch {
    return []
  }
}

// Legacy — kept for any existing pages that import these
export const getTrendingGames   = getPopularGames
export const getGamesByGenre    = async (genre: string, page = 1): Promise<Game[]> => {
  const { data } = await api.get("/games/genre", { params: { genre, page } })
  return data.data
}
