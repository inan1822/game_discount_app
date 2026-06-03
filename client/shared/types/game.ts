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

/** ITAD-sourced price for home-page cards — includes discount percentage */
export interface CardPrice {
  price:   number   // current sale price (USD)
  regular: number   // regular (non-sale) price
  cut:     number   // 0–100 discount percentage (0 = no discount)
  isFree:  boolean  // true when game is free-to-play (price === 0)
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
  /** Set when this row represents a DLC discount (returned by /games/dlc-deals). */
  dlcName?: string
  /** True when this row is an admin-curated manual link (not an auto ITAD deal). */
  isManual?: boolean
  /** Platform a manual link is tied to — drives the console-chip filter. */
  manualPlatform?: ManualLinkPlatform
  /** Subscription service that includes this game for free. */
  subscriptionName?: string | null
  /** ISO string — when the deal expires (manual links only). */
  discountExpiresAt?: string | null
  /** True when admin has flagged this as limited stock. */
  isLimitedStock?: boolean
  /** ISO currency code for the price fields (undefined → USD / "$"). */
  currency?: string
  /** True when this row is a live reseller "from" price (e.g. Driffle). */
  isReseller?: boolean
}

/** Admin-curated manual store/website link for a game (GET /games/:rawgId/manual-links). */
export type ManualLinkPlatform = "pc" | "ps" | "xbox" | "switch" | "all"

export interface ManualLink {
  _id:               string
  rawgId:            string
  label:             string
  url:               string
  platform:          ManualLinkPlatform
  price:             number | null
  storeIcon:         string
  note:              string
  subscriptionName:  string | null
  discountExpiresAt: string | null
  isLimitedStock:    boolean
  isActive:          boolean
  /** Live price auto-fetched server-side for supported reseller URLs (e.g. Driffle). */
  liveOffer?:        { price: number; currency: string; inStock: boolean; url: string }
}
