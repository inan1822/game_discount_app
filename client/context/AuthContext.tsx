"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import api from "@/lib/api/axios"
import type { User } from "@/types/user"

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isGuest: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  loginAsGuest: () => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)

  // Restore session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("dislow_token")
    if (savedToken) {
      setToken(savedToken)
      fetchMe()
    } else {
      const guest = localStorage.getItem("dislow_guest") === "true"
      setIsGuest(guest)
      setIsLoading(false)
    }
  }, [])

  const fetchMe = async () => {
    try {
      const { data } = await api.get("/auth/me")
      setUser(data.data)
    } catch {
      logout()
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password })
    const { token: newToken } = data.data
    localStorage.setItem("dislow_token", newToken)
    setToken(newToken)
    await fetchMe()
  }

  const register = async (name: string, email: string, password: string) => {
    await api.post("/auth/register", { name, email, password })
    // After register, user needs to verify email before logging in
  }

  const loginAsGuest = () => {
    localStorage.setItem("dislow_guest", "true")
    setIsGuest(true)
  }

  const logout = () => {
    localStorage.removeItem("dislow_token")
    localStorage.removeItem("dislow_user")
    localStorage.removeItem("dislow_guest")
    setUser(null)
    setToken(null)
    setIsGuest(false)
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      isGuest,
      login,
      register,
      loginAsGuest,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
