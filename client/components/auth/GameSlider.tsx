"use client"

import { useEffect, useState } from "react"
import { getTrendingGames } from "@/lib/api/games"

// High-quality fallback RAWG covers — portrait format
const FALLBACK_COVERS = [
  "https://media.rawg.io/media/games/021/021c4e21a1824d2526f925eff6735d33.jpg",
  "https://media.rawg.io/media/games/456/456dea5e1c7e3cd07060c14e96612001.jpg",
  "https://media.rawg.io/media/games/b8c/b8c243eaa0fbac8115e0cdccac3f91dc.jpg",
  "https://media.rawg.io/media/games/f87/f87457e8347484033cb34cde6101d08d.jpg",
  "https://media.rawg.io/media/games/20a/20aa03a10cda45239fe22d035c0ebe64.jpg",
  "https://media.rawg.io/media/games/736/73619bd336c894d6941d926bfd563946.jpg",
  "https://media.rawg.io/media/games/d82/d82990b9c67ba0d2d09d4e6fa88885a7.jpg",
  "https://media.rawg.io/media/games/c4b/c4b0cab189e73432de3a250d8cf1c84e.jpg",
  "https://media.rawg.io/media/games/f46/f466571d536f2e3ea9e815ad17177501.jpg",
  "https://media.rawg.io/media/games/34b/34b1f1850a1c06fd971bc6ab3ac0ce0e.jpg",
  "https://media.rawg.io/media/games/a3c/a3c529213f1bdfd6c09b77d55e8e5bfe.jpg",
  "https://media.rawg.io/media/games/b54/b54598d1d5cc31899f4f0a7e018f9a1b.jpg",
]

export function GameSlider() {
  const [covers, setCovers] = useState<string[]>(FALLBACK_COVERS)

  useEffect(() => {
    getTrendingGames()
      .then(games => {
        const urls = games
          .filter(g => g.cover)
          .map(g => g.cover as string)
        if (urls.length >= 6) setCovers(urls)
      })
      .catch(() => {
        // Keep fallback covers silently
      })
  }, [])

  // Duplicate for seamless infinite loop
  const doubled = [...covers, ...covers]

  return (
    // Fills the entire left panel — absolute inset-0, parent is position:relative
    <div className="slider-row-container">
      <div className="slider-track">
        {doubled.map((src, i) => (
          <CoverCard key={i} src={src} />
        ))}
      </div>
    </div>
  )
}

function CoverCard({ src }: { src: string }) {
  return (
    // 280px wide, fills full panel height, no radius, no gap
    <div className="flex-shrink-0 overflow-hidden" style={{ width: 280, height: 560, borderRadius: 0 }}>
      <img
        src={src}
        alt=""
        className="w-full h-full object-cover opacity-70"
        style={{ filter: "blur(10px)", transform: "scale(1.04)" }}
        loading="lazy"
        onError={e => {
          ;(e.currentTarget as HTMLImageElement).style.display = "none"
        }}
      />
    </div>
  )
}
