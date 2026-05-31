import type { Metadata } from "next"
import axios from "axios"
import GameDetailClient from "./GameDetailClient"

const API_URL  = process.env.NEXT_PUBLIC_API_URL  || "http://localhost:5000"
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

interface GameMeta {
  name?:        string
  description?: string
  cover?:       string | null
}

// Server-side fetch for metadata only — no auth needed, public endpoint.
async function fetchGameMeta(id: string): Promise<GameMeta | null> {
  try {
    const { data } = await axios.get(`${API_URL}/api/v1/games/${id}`, { timeout: 5000 })
    return (data?.data ?? null) as GameMeta | null
  } catch {
    return null
  }
}

// Dynamic per-game SEO metadata (title, description, OpenGraph image).
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params
  const game = await fetchGameMeta(id)

  if (!game?.name) {
    return {
      title:       "Game",
      description: "Compare prices and track deals for this game on DisLow.",
    }
  }

  const desc = game.description
    ? game.description.replace(/<[^>]*>/g, "").slice(0, 160)
    : `Compare prices for ${game.name} across Steam, Epic, GOG, PlayStation, Xbox and more on DisLow.`

  return {
    title:       game.name,
    description: desc,
    alternates:  { canonical: `${SITE_URL}/game/${id}` },
    openGraph: {
      title:       `${game.name} — DisLow`,
      description: desc,
      url:         `${SITE_URL}/game/${id}`,
      type:        "website",
      images:      game.cover ? [{ url: game.cover, alt: game.name }] : undefined,
    },
    twitter: {
      card:        game.cover ? "summary_large_image" : "summary",
      title:       `${game.name} — DisLow`,
      description: desc,
      images:      game.cover ? [game.cover] : undefined,
    },
  }
}

// The interactive UI is a client component; this server page only adds metadata.
export default function GameDetailPage() {
  return <GameDetailClient />
}
