import axios from "axios"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + "/api/v1",
  headers: { "Content-Type": "application/json" }
})

// Attach JWT token from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("dislow_token")
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401 → clear auth and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("dislow_token")
      localStorage.removeItem("dislow_user")
      window.location.href = "/login"
    }
    return Promise.reject(error)
  }
)

export default api
