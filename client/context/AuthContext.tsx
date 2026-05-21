"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import api from "@/lib/api/axios"
import type { User } from "@/types/user"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isGuest: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  loginAsGuest: () => void
  logout: () => Promise<void>
  updateUser: (patch: Partial<User>) => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)

  // fetchMe wrapped in useCallback so it's stable across renders
  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me")
      setUser(data.data)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Restore session on mount — the httpOnly cookie is sent automatically
  useEffect(() => {
    const guest = localStorage.getItem("dislow_guest") === "true"
    setIsGuest(guest)
    fetchMe()
  }, [fetchMe])

  const login = useCallback(async (email: string, password: string) => {
    await api.post("/auth/login", { email, password })
    // Server sets the httpOnly cookie; just fetch the user profile
    await fetchMe()
  }, [fetchMe])

  const register = useCallback(async (name: string, email: string, password: string) => {
    await api.post("/auth/register", { name, email, password })
    // After register the user must verify email before logging in
  }, [])

  const loginAsGuest = useCallback(() => {
    localStorage.setItem("dislow_guest", "true")
    setIsGuest(true)
  }, [])

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...patch } : null)
  }, [])

  const logout = useCallback(async () => {
    try {
      // Ask the server to clear the DB token and the httpOnly cookie
      await api.post("/auth/logout")
    } catch {
      // Ignore — proceed with local cleanup regardless
    }
    localStorage.removeItem("dislow_guest")
    setUser(null)
    setIsGuest(false)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isGuest,
      login,
      register,
      loginAsGuest,
      logout,
      updateUser,
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
