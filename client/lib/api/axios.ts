import axios from "axios"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + "/api/v1",
  headers: { "Content-Type": "application/json" },
  // Required so the browser sends the httpOnly auth cookie on cross-origin requests
  withCredentials: true,
})

// On 401 → redirect to login UNLESS the call was /auth/me (session restore on mount).
// /auth/me returning 401 just means "not logged in" — AuthContext handles it silently.
// Redirecting there would cause an infinite loop: mount → 401 → /login → mount → repeat.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error.config?.url ?? ""
    const isSessionRestore = url.includes("/auth/me")
    if (error.response?.status === 401 && typeof window !== "undefined" && !isSessionRestore) {
      window.location.href = "/login"
    }
    return Promise.reject(error)
  }
)

export default api
