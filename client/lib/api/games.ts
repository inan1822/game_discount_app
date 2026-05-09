import api from "./axios"
import type { Game } from "@/types/game"

export const searchGames = async (q: string, page = 1): Promise<Game[]> => {
  const { data } = await api.get("/games/search", { params: { q, page } })
  return data.data
}

export const getGameById = async (id: string): Promise<Game> => {
  const { data } = await api.get(`/games/${id}`)
  return data.data
}

export const getTrendingGames = async (): Promise<Game[]> => {
  const { data } = await api.get("/games/trending")
  return data.data
}

export const getGamesByGenre = async (genre: string, page = 1): Promise<Game[]> => {
  const { data } = await api.get("/games/genre", { params: { genre, page } })
  return data.data
}
