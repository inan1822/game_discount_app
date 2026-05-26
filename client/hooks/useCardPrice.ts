"use client"

import { useEffect, useState } from "react"
import { getCardPrices } from "@/lib/api/games"
import type { CardPrice, Game } from "@/types/game"

// ─── Module-level batch queue ─────────────────────────────────────────────────
//
// All useCardPrice() calls that fire within the same 50 ms window are merged
// into a single POST /games/card-prices request. The module-level cache
// persists for the lifetime of the page so identical game IDs across different
// sections never trigger a second network call.

const cache   = new Map<number, CardPrice | null>()          // gameId → price
const pending = new Map<number, Game>()                       // games waiting for the next batch
const subs    = new Map<number, Set<(p: CardPrice | null) => void>>()  // listeners
let   timer:  ReturnType<typeof setTimeout> | null = null

function flush() {
  timer = null
  const games = [...pending.values()]
  pending.clear()
  if (!games.length) return

  getCardPrices(games.map(g => ({ id: g.id, name: g.name, steamAppId: g.steamAppId, released: g.released })))
    .then(results => {
      for (const [rawId, price] of Object.entries(results)) {
        const id = Number(rawId)
        cache.set(id, price)
        subs.get(id)?.forEach(cb => cb(price))
      }
    })
    .catch(() => {})
}

// ─── primeCache ───────────────────────────────────────────────────────────────
/**
 * Pre-populate the hook cache from an existing fetch result.
 * Call this after any batch getCardPrices() call so cards that mount later
 * are served instantly from cache instead of firing a duplicate request.
 */
export function primeCache(results: Record<number, CardPrice | null>) {
  for (const [rawId, price] of Object.entries(results)) {
    const id = Number(rawId)
    cache.set(id, price)
    // Notify any already-mounted hook instances waiting for this game
    subs.get(id)?.forEach(cb => cb(price))
  }
}

// ─── useCardPrice ─────────────────────────────────────────────────────────────
/**
 * Returns the lowest currently-available price for `game`, sourced from ITAD
 * via the backend POST /games/card-prices endpoint.
 *
 * | Return value | Meaning                              |
 * |---|---|
 * | `undefined`  | Still loading (show a shimmer/dash)  |
 * | `null`       | Game not tracked by any store         |
 * | `CardPrice`  | Price data ready                     |
 *
 * Multiple cards rendered in the same 50 ms window share one HTTP request.
 * Results are cached for the lifetime of the page session.
 */
export function useCardPrice(game: Game): CardPrice | null | undefined {
  const [price, setPrice] = useState<CardPrice | null | undefined>(() =>
    cache.has(game.id) ? cache.get(game.id) : undefined
  )

  useEffect(() => {
    // Already cached — serve immediately and skip the queue
    if (cache.has(game.id)) {
      setPrice(cache.get(game.id))
      return
    }

    // Subscribe so we get notified when the batch result arrives
    const cb = (p: CardPrice | null) => setPrice(p)
    if (!subs.has(game.id)) subs.set(game.id, new Set())
    subs.get(game.id)!.add(cb)

    // Enqueue and schedule a flush (debounced 50 ms)
    pending.set(game.id, game)
    if (!timer) timer = setTimeout(flush, 50)

    return () => {
      const set = subs.get(game.id)
      if (set) {
        set.delete(cb)
        if (!set.size) subs.delete(game.id)
      }
    }
  }, [game.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return price
}
