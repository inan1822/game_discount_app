import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
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
    ],
  },
};

export default nextConfig;
