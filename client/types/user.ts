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
