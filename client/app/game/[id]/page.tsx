"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Heart, Star, ExternalLink } from "lucide-react"
import { getGameById } from "@/lib/api/games"
import { getDealsByTitle } from "@/lib/api/cheapshark"
import { useWishlist } from "@/context/WishlistContext"
import type { Game, PriceResult } from "@/types/game"

export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { isInWishlist, toggle } = useWishlist()

  const [game, setGame] = useState<Game | null>(null)
  const [deals, setDeals] = useState<PriceResult[]>([])
  const [loadingGame, setLoadingGame] = useState(true)
  const [loadingDeals, setLoadingDeals] = useState(true)

  useEffect(() => {
    if (!id) return
    fetchGame()
  }, [id])

  const fetchGame = async () => {
    try {
      const g = await getGameById(id)
      setGame(g)
      fetchDeals(g.name)
    } catch {
      router.push("/")
    } finally {
      setLoadingGame(false)
    }
  }

  const fetchDeals = async (name: string) => {
    try {
      const d = await getDealsByTitle(name)
      setDeals(d)
    } catch {
      // no deals found — silent
    } finally {
      setLoadingDeals(false)
    }
  }

  const inWishlist = game ? isInWishlist(String(game.id)) : false

  if (loadingGame) return <GameDetailSkeleton />

  if (!game) return null

  return (
    <div className="relative pb-24 min-h-screen">
      {/* Blobs */}
      <div className="blob-purple w-48 h-48 top-0 -right-16" />

      {/* Hero cover */}
      <div className="relative w-full h-64">
        {game.cover ? (
          <img src={game.cover} alt={game.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-[#2a2d32]" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#12131a] via-[#12131a]/60 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-12 left-4 w-9 h-9 glass rounded-full flex items-center justify-center z-10"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>

        {/* Wishlist button */}
        <button
          onClick={() => game && toggle(game)}
          className="absolute top-12 right-4 w-9 h-9 glass rounded-full flex items-center justify-center z-10"
        >
          <Heart
            size={18}
            className={inWishlist ? "text-[#AE3BD6] fill-[#AE3BD6]" : "text-white"}
          />
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10 px-5 -mt-8 space-y-5">
        {/* Title + meta */}
        <div>
          <h1 className="text-2xl font-bold text-white leading-tight">{game.name}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {/* Rating */}
            <div className="flex items-center gap-1">
              <Star size={14} className="text-yellow-400 fill-yellow-400" />
              <span className="text-sm text-white font-semibold">{game.rating.toFixed(1)}</span>
            </div>
            {/* Metacritic */}
            {game.metacritic && (
              <span className="text-xs px-2 py-0.5 rounded bg-[#44d62c] text-black font-bold">
                MC {game.metacritic}
              </span>
            )}
            {/* Release year */}
            {game.released && (
              <span className="text-xs text-[#9fa0a1]">{game.released.slice(0, 4)}</span>
            )}
          </div>
          {/* Genres */}
          <div className="flex gap-2 mt-2 flex-wrap">
            {game.genres.map(g => (
              <span
                key={g}
                className="text-xs px-3 py-1 rounded-full glass text-[#b3bade]"
              >
                {g}
              </span>
            ))}
          </div>
        </div>

        {/* Description */}
        {game.description && (
          <div>
            <h2 className="text-white font-bold text-sm mb-2">About</h2>
            <p className="text-[#9fa0a1] text-sm leading-relaxed line-clamp-4">
              {game.description}
            </p>
          </div>
        )}

        {/* Platforms */}
        <div>
          <h2 className="text-white font-bold text-sm mb-2">Available on</h2>
          <div className="flex gap-2 flex-wrap">
            {game.platforms.map(p => (
              <span key={p} className="text-xs px-3 py-1 rounded-full glass text-[#b3bade]">{p}</span>
            ))}
          </div>
        </div>

        {/* Price comparison */}
        <div>
          <h2 className="text-white font-bold text-sm mb-3">
            Best Prices Right Now
            <span className="text-[#9fa0a1] text-xs font-normal ml-2">via CheapShark</span>
          </h2>

          {loadingDeals ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 rounded-[16px] bg-[#1c1e2a] animate-pulse" />
              ))}
            </div>
          ) : deals.length === 0 ? (
            <div className="glass rounded-[16px] p-4 text-center text-[#9fa0a1] text-sm">
              No PC deals found right now
            </div>
          ) : (
            <div className="space-y-2">
              {deals.map((deal) => (
                <a
                  key={deal.dealID}
                  href={deal.dealLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between glass rounded-[16px] px-4 py-3 hover:border-[#AE3BD6]/50 border border-transparent transition-all group"
                >
                  <div className="flex items-center gap-3">
                    {deal.storeIcon && (
                      <img src={deal.storeIcon} alt={deal.storeName} className="w-6 h-6 object-contain" />
                    )}
                    <span className="text-white text-sm font-semibold">{deal.storeName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {deal.savings > 0 && (
                      <span className="discount-badge">-{Math.round(deal.savings)}%</span>
                    )}
                    {parseFloat(deal.normalPrice) > parseFloat(deal.salePrice) && (
                      <span className="text-[#9fa0a1] text-xs line-through">${deal.normalPrice}</span>
                    )}
                    <span className="text-white font-bold text-sm">
                      {parseFloat(deal.salePrice) === 0 ? "FREE" : `$${deal.salePrice}`}
                    </span>
                    <ExternalLink size={12} className="text-[#9fa0a1] group-hover:text-[#AE3BD6] transition-colors" />
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function GameDetailSkeleton() {
  return (
    <div className="pb-24">
      <div className="w-full h-64 bg-[#1c1e2a] animate-pulse" />
      <div className="px-5 -mt-8 space-y-4">
        <div className="h-7 w-48 bg-[#2a2d32] rounded animate-pulse" />
        <div className="h-4 w-32 bg-[#2a2d32] rounded animate-pulse" />
        <div className="space-y-2 mt-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 rounded-[16px] bg-[#1c1e2a] animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
