import type { MetadataRoute } from "next"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Admin lives in a separate app now, but block these defensively
      disallow: ["/admin", "/api", "/checkout", "/account"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
