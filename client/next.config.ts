import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },

  // sharp is Next.js's optional dep for server-side image optimization.
  // With output:"export" there is no server, so sharp is never called.
  // Keeping it external prevents the native binary from being loaded by
  // Turbopack during dev, which was the root cause of the 15 GB heap OOM.
  serverExternalPackages: ["sharp"],

  // Tell Turbopack the root is the client folder, not the parent
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.rawg.io",
      },
      {
        protocol: "https",
        hostname: "www.cheapshark.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        // Google OAuth profile pictures
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        // Discord CDN avatars
        protocol: "https",
        hostname: "cdn.discordapp.com",
      },
      {
        // Steam avatars
        protocol: "https",
        hostname: "avatars.steamstatic.com",
      },
    ],
  },
};

export default nextConfig;
