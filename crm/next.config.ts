import type { NextConfig } from "next"
import path from "path"

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  turbopack: { root: path.resolve(__dirname) },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.rawg.io" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "avatars.steamstatic.com" },
      { protocol: "https", hostname: "www.google.com" },
      { protocol: "https", hostname: "www.cheapshark.com" },
    ],
  },
}

export default nextConfig
