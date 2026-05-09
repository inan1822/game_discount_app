// CheapShark is called DIRECTLY from the browser (CORS supported, no key needed)
// IMPORTANT: Always use CheapShark redirect links — do NOT link directly to stores

import axios from "axios"
import type { CheapSharkDeal, CheapSharkStore, PriceResult } from "@/types/game"

const CS = axios.create({
  baseURL: "https://www.cheapshark.com/api/1.0",
  headers: {
    // Required by CheapShark API policy
    "User-Agent": "DisLow/1.0 (bananagamer182@gmail.com)"
  }
})

let storesCache: CheapSharkStore[] | null = null

export const getStores = async (): Promise<CheapSharkStore[]> => {
  if (storesCache) return storesCache
  const { data } = await CS.get<CheapSharkStore[]>("/stores")
  storesCache = data
  return data
}

export const getDealsByTitle = async (title: string): Promise<PriceResult[]> => {
  const [dealsRes, stores] = await Promise.all([
    CS.get<CheapSharkDeal[]>("/deals", {
      params: { title, pageSize: 10, sortBy: "Price" }
    }),
    getStores()
  ])

  const deals = dealsRes.data
  const storeMap = Object.fromEntries(stores.map(s => [s.storeID, s]))

  return deals.map((deal) => {
    const store = storeMap[deal.storeID]
    return {
      storeID: deal.storeID,
      storeName: store?.storeName ?? `Store ${deal.storeID}`,
      storeIcon: store
        ? `https://www.cheapshark.com${store.images.icon}`
        : "",
      salePrice: deal.salePrice,
      normalPrice: deal.normalPrice,
      savings: parseFloat(deal.savings),
      dealID: deal.dealID,
      // MUST use CheapShark redirect link — required by their terms
      dealLink: `https://www.cheapshark.com/redirect?dealID=${deal.dealID}`
    }
  })
}

export const searchDeals = async (query: string): Promise<CheapSharkDeal[]> => {
  const { data } = await CS.get<CheapSharkDeal[]>("/deals", {
    params: { title: query, pageSize: 20, sortBy: "Deal Rating" }
  })
  return data
}
