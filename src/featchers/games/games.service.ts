import axios from "axios"
import { AppError } from "../../shared/utils/AppError.js"

const RAWG_BASE = "https://api.rawg.io/api"
const RAWG_KEY = process.env.RAWG_API

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RawgGame {
    id: number
    slug: string
    name: string
    background_image: string | null
    rating: number
    ratings_count: number
    genres: { id: number; name: string }[]
    platforms: { platform: { id: number; name: string; slug: string } }[]
    released: string
    metacritic: number | null
}

export interface GameSearchResult {
    id: number
    slug: string
    name: string
    cover: string | null
    rating: number
    genres: string[]
    platforms: string[]
    released: string
    metacritic: number | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatGame = (game: RawgGame): GameSearchResult => ({
    id: game.id,
    slug: game.slug,
    name: game.name,
    cover: game.background_image,
    rating: game.rating,
    genres: game.genres?.map(g => g.name) ?? [],
    platforms: game.platforms?.map(p => p.platform.name) ?? [],
    released: game.released,
    metacritic: game.metacritic
})

// ─── Services ─────────────────────────────────────────────────────────────────

export const searchGamesService = async (query: string, page = 1): Promise<GameSearchResult[]> => {
    if (!query || query.trim().length < 2) {
        throw new AppError("Search query must be at least 2 characters", 400)
    }

    const { data } = await axios.get(`${RAWG_BASE}/games`, {
        params: {
            key: RAWG_KEY,
            search: query,
            page_size: 20,
            page
        }
    })

    return (data.results as RawgGame[]).map(formatGame)
}

export const getGameByIdService = async (id: string): Promise<GameSearchResult & { description: string }> => {
    const { data } = await axios.get(`${RAWG_BASE}/games/${id}`, {
        params: { key: RAWG_KEY }
    })

    if (!data || !data.id) {
        throw new AppError("Game not found", 404)
    }

    return {
        ...formatGame(data),
        description: data.description_raw ?? ""
    }
}

export const getTrendingGamesService = async (): Promise<GameSearchResult[]> => {
    const { data } = await axios.get(`${RAWG_BASE}/games`, {
        params: {
            key: RAWG_KEY,
            ordering: "-rating",
            page_size: 20,
            metacritic: "80,100"
        }
    })

    return (data.results as RawgGame[]).map(formatGame)
}

export const getGamesByGenreService = async (genre: string, page = 1): Promise<GameSearchResult[]> => {
    const { data } = await axios.get(`${RAWG_BASE}/games`, {
        params: {
            key: RAWG_KEY,
            genres: genre,
            page_size: 20,
            page,
            ordering: "-rating"
        }
    })

    return (data.results as RawgGame[]).map(formatGame)
}
