export interface NotificationPrefs {
  events: boolean
  discounts: boolean
}

export interface User {
  _id: string
  name: string
  email: string
  role: 'user' | 'admin'
  isVerified: boolean
  createdAt: string
  avatar?: string
  notificationPrefs?: NotificationPrefs
  googleId?: string
  discordId?: string
  steamId?: string
  pendingEmail?: string
}

export interface AuthResponse {
  status: string
  message: string
  data: {
    token: string
    userID: string
  }
}

// ─── Friends system ─────────────────────────────────────────────────────────

export type Relationship =
  | "self"
  | "following"
  | "requested"
  | "they-requested-me"
  | "follows-me"
  | "friends"
  | "none"

export interface FriendListItem {
  _id: string
  displayName: string
  avatarUrl: string | null
  isOnline: boolean
  sharedGamesCount: number
  sharedFriendsCount: number
}

export interface FollowRequestUser {
  _id: string
  displayName: string
  avatarUrl: string | null
}

export interface UserSearchResult {
  _id: string
  displayName: string
  avatarUrl: string | null
  isPrivate: boolean
  relationship: Relationship
}

export interface FriendProfileFavorite {
  gameId: string
  gameName: string
  gameCover: string | null
  gameSlug: string
}

export interface FriendProfile {
  _id: string
  displayName: string
  avatarUrl: string | null
  isPrivate: boolean
  isOnline: boolean
  followingCount: number
  followersCount: number
  sharedFriendsCount: number
  sharedGamesCount: number
  relationship: Relationship
  favorites: FriendProfileFavorite[] | null
}
