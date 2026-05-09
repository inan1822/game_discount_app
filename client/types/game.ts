export interface Game {
  id: number
  slug: string
  name: string
  cover: string | null
  rating: number
  genres: string[]
  platforms: string[]
  released: string
  metacritic: number | null
  description?: string
}

export interface WishlistItem {
  _id: string
  gameId: string
  gameName: string
  gameCover: string | null
  gameSlug: string
  addedAt: string
}

// CheapShark types (used client-side directly)
export interface CheapSharkDeal {
  storeID: string
  dealID: string
  salePrice: string
  normalPrice: string
  savings: string
  steamAppID?: string
  thumb: string
  title: string
  internalName: string
  metacriticScore: string
  steamRatingText?: string
  steamRatingPercent?: string
}

export interface CheapSharkStore {
  storeID: string
  storeName: string
  images: {
    banner: string
    logo: string
    icon: string
  }
}

export interface PriceResult {
  storeID: string
  storeName: string
  storeIcon: string
  salePrice: string
  normalPrice: string
  savings: number
  dealID: string
  dealLink: string
}
