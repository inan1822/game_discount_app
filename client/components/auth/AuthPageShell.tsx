"use client"

import { useState, useEffect, ReactNode } from "react"
import { BackgroundGradientAnimation } from "@/components/ui/BackgroundGradientAnimation"
import { CircularGallery, GalleryItem } from "@/components/ui/CircularGallery"

// Steam CDN library portrait covers — 600×900
const COVERS = [
  "https://cdn.akamai.steamstatic.com/steam/apps/1245620/library_600x900.jpg",
  "https://cdn.akamai.steamstatic.com/steam/apps/1174180/library_600x900.jpg",
  "https://cdn.akamai.steamstatic.com/steam/apps/1091500/library_600x900.jpg",
  "https://cdn.akamai.steamstatic.com/steam/apps/1145360/library_600x900.jpg",
  "https://cdn.akamai.steamstatic.com/steam/apps/814380/library_600x900.jpg",
  "https://cdn.akamai.steamstatic.com/steam/apps/1190460/library_600x900.jpg",
  "https://cdn.akamai.steamstatic.com/steam/apps/870780/library_600x900.jpg",
  "https://cdn.akamai.steamstatic.com/steam/apps/632470/library_600x900.jpg",
  "https://cdn.akamai.steamstatic.com/steam/apps/1326470/library_600x900.jpg",
  "https://cdn.akamai.steamstatic.com/steam/apps/1551360/library_600x900.jpg",
  "https://cdn.akamai.steamstatic.com/steam/apps/1938090/library_600x900.jpg",
  "https://cdn.akamai.steamstatic.com/steam/apps/2358720/library_600x900.jpg",
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function toItems(urls: string[]): GalleryItem[] {
  return urls.map(url => ({ common: "", binomial: "", photo: { url, text: "", by: "", pos: "center" } }))
}

export function AuthPageShell({ children }: { children: ReactNode }) {
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(toItems(COVERS))

  useEffect(() => {
    setGalleryItems(toItems(shuffle(COVERS)))
  }, [])

  return (
    <main
      className="relative flex flex-col h-screen w-screen overflow-hidden"
      style={{ background: "#1E2532" }}
    >
      {/* Layer 1 — animated gradient blobs */}
      <BackgroundGradientAnimation />

      {/* Layer 2 — auth background top SVG tint */}
      <img
        src="/icons/auth-bg-top.svg"
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 2, objectFit: "cover" }}
      />

      {/* Layer 3 — page content (card centred) */}
      <div
        className="relative flex-1 flex items-center justify-center px-4"
        style={{ zIndex: 3, paddingBottom: 80 }}
      >
        {children}
      </div>

      {/* Layer 1 (under card) — 3D carousel */}
      <div
        className="relative flex-shrink-0 w-full"
        style={{ height: 260, zIndex: 1 }}
      >
        <CircularGallery
          items={galleryItems}
          radius={620}
          autoRotateSpeed={0.012}
          showOverlay={false}
        />
      </div>

      {/* Bottom breathing room */}
      <div className="flex-shrink-0" style={{ height: 120 }} />
    </main>
  )
}
