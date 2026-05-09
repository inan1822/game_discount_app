export interface User {
  _id: string
  name: string
  email: string
  role: 'user' | 'admin'
  isVerified: boolean
  createdAt: string
}

export interface AuthResponse {
  status: string
  message: string
  data: {
    token: string
    userID: string
  }
}
