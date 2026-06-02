import axios from "axios"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + "/api/v1",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
})

// Attach stored JWT as Bearer token — fallback for cross-domain envs where
// the httpOnly cookie is blocked by third-party cookie restrictions.
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("dislow_token")
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401 → redirect to login, with these exceptions:
//   /auth/me          — session restore; 401 = "not logged in", AuthContext handles silently
//   /users/me/*       — user-action endpoints (change password, edit profile, delete account);
//                       401 here means "wrong current password", not "session expired"
//                       The component's catch block must show the error toast instead
//   /auth/login       — login attempt; 401 = wrong credentials, form handles it
//   /auth/admin       — 2FA verify; 401 = wrong OTP, form handles it
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error.config?.url ?? ""
    const skipRedirect =
      url.includes("/auth/me") ||
      url.includes("/users/me") ||
      url.includes("/auth/login") ||
      url.includes("/auth/admin")
    if (error.response?.status === 401 && typeof window !== "undefined" && !skipRedirect) {
      window.location.href = "/login"
    }
    return Promise.reject(error)
  }
)

export default api
