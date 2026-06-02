"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import api from "@/shared/services/axios"
import { setAuthMarker, clearAuthMarker } from "@/shared/utils/authMarker"
import type { User } from "@/shared/types/user"

interface LoginResult {
  /** True when the backend asked for a 2FA OTP (admin accounts). Caller must
   *  then collect the code and call verifyTwoFactor(). */
  requiresTwoFactor: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isGuest: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  verifyTwoFactor: (email: string, code: string) => Promise<User | null>
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
      setAuthMarker()   // keep the middleware marker in sync with a valid session
    } catch (err: any) {
      setUser(null)
      if (err?.response?.status === 401) {
        // Token expired or rejected — remove it so the middleware cookie
        // doesn't keep blocking navigation to /login.
        localStorage.removeItem("dislow_token")
        clearAuthMarker()
      } else if (!localStorage.getItem("dislow_token")) {
        clearAuthMarker()
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Restore session on mount — Bearer token from localStorage is sent by axios.
  // Set the marker synchronously first so a hard-reload of a protected page
  // isn't bounced by middleware before fetchMe resolves.
  useEffect(() => {
    const guest = localStorage.getItem("dislow_guest") === "true"
    setIsGuest(guest)
    if (localStorage.getItem("dislow_token")) setAuthMarker()
    fetchMe()
  }, [fetchMe])

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const { data } = await api.post("/auth/login", { email, password })
    const requiresTwoFactor = !data?.data?.userID
    if (!requiresTwoFactor) {
      // Store token in localStorage so axios can send it as Bearer on cross-domain requests
      if (data?.data?.token) localStorage.setItem("dislow_token", data.data.token)
      setAuthMarker()   // let server-side middleware know a session exists
      await fetchMe()
    }
    return { requiresTwoFactor }
  }, [fetchMe])

  const verifyTwoFactor = useCallback(async (email: string, code: string): Promise<User | null> => {
    const { data: verifyData } = await api.post("/auth/admin", { email, code })
    // Store token for cross-domain Bearer auth, then pull /me to populate context.
    if (verifyData?.data?.token) localStorage.setItem("dislow_token", verifyData.data.token)
    setAuthMarker()
    const { data } = await api.get("/auth/me")
    setUser(data.data)
    return data.data
  }, [])

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
    localStorage.removeItem("dislow_token")
    clearAuthMarker()
    setUser(null)
    setIsGuest(false)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isGuest,
      login,
      verifyTwoFactor,
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
