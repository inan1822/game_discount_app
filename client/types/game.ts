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
  steamAppId?: string        // extracted from RAWG store URLs — used for exact ITAD lookup
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

export interface GiveawayItem {
  id:           number
  title:        string
  worth:        string       // e.g. "$14.99" or "$0.00"
  thumbnail:    string
  description:  string
  instructions: string
  claimUrl:     string
  endDate:      string       // "N/A" when no expiry
  platforms:    string       // e.g. "PC, Steam"
  users:        number
}

/** A Steam news/events item from ISteamNews GetNewsForApp */
export interface GameEvent {
  id:         string
  title:      string
  url:        string
  author:     string
  summary:    string    // plain-text excerpt ~200 chars
  date:       number    // Unix timestamp (seconds)
  feedLabel:  string    // e.g. "Community Announcements", "Game Updates"
  isExternal: boolean
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
