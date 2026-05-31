import type { MetadataRoute } from "next"
import axios from "axios"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
const API_URL  = process.env.NEXT_PUBLIC_API_URL  || "http://localhost:5000"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Static, always-present routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`,         lastModified: now, changeFrequency: "daily",  priority: 1.0 },
    { url: `${SITE_URL}/search`,   lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/login`,    lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/register`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ]

  // Dynamic game routes — best-effort; if the API is down, ship static routes only
  try {
    const { data } = await axios.get(`${API_URL}/api/v1/games/popular`, { timeout: 5000 })
    const games = (data?.data ?? []) as Array<{ id: number | string }>
    const gameRoutes: MetadataRoute.Sitemap = games.slice(0, 50).map(g => ({
      url:             `${SITE_URL}/game/${g.id}`,
      lastModified:    now,
      changeFrequency: "daily" as const,
      priority:        0.7,
    }))
    return [...staticRoutes, ...gameRoutes]
  } catch {
    return staticRoutes
  }
}
