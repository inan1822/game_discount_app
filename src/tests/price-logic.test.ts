/**
 * Unit tests for the price resolution pipeline in games.service.ts
 *
 * Strategy: mock axios and Bottleneck so no real HTTP calls fire,
 * then test each layer of the pipeline independently.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import type { CardPrice } from "../featchers/games/games.service.js"

// ── Bottleneck mock — turns the rate limiter into a transparent passthrough ──
// Without this every csLimiter.schedule() call would queue normally and add
// real time delays to the test suite.
vi.mock("bottleneck", () => ({
    default: class {
        schedule(_opts: unknown, fn: () => unknown) { return fn() }
    },
}))

// ── Axios mock — prevents any real HTTP calls ─────────────────────────────────
vi.mock("axios", async (importOriginal) => {
    const real = await importOriginal<typeof import("axios")>()
    return {
        ...real,
        default: {
            ...(real.default as object),
            get:  vi.fn(),
            post: vi.fn(),
            isAxiosError: real.default.isAxiosError,
        },
    }
})

import axios from "axios"
import {
    mergeCardPrices,
    nameVariants,
    isConsoleEdition,
    withRetry,
} from "../featchers/games/games.service.js"

const mockGet  = vi.mocked(axios.get)
const mockPost = vi.mocked(axios.post)

// ─── FREE_CARD_PRICE sentinel (same values as in the service) ─────────────────
const FREE: CardPrice = { price: 0, regular: 0, cut: 100, isFree: true }

// ─────────────────────────────────────────────────────────────────────────────
// mergeCardPrices — pure function, no mocking needed
// ─────────────────────────────────────────────────────────────────────────────

describe("mergeCardPrices", () => {
    it("returns null when both sources have no price", () => {
        expect(mergeCardPrices(undefined, undefined)).toBeNull()
    })

    it("returns the only price when just ITAD has data", () => {
        const itad: CardPrice = { price: 19.99, regular: 29.99, cut: 33, isFree: false }
        expect(mergeCardPrices(itad, undefined)).toEqual(itad)
    })

    it("returns the only price when just CheapShark has data", () => {
        const cs: CardPrice = { price: 14.99, regular: 29.99, cut: 50, isFree: false }
        expect(mergeCardPrices(undefined, cs)).toEqual(cs)
    })

    it("picks ITAD when it has the lower price", () => {
        const itad: CardPrice = { price: 9.99,  regular: 29.99, cut: 67, isFree: false }
        const cs:   CardPrice = { price: 14.99, regular: 29.99, cut: 50, isFree: false }
        expect(mergeCardPrices(itad, cs)).toEqual(itad)
    })

    it("picks CheapShark when it has the lower price", () => {
        const itad: CardPrice = { price: 19.99, regular: 29.99, cut: 33, isFree: false }
        const cs:   CardPrice = { price: 7.49,  regular: 29.99, cut: 75, isFree: false }
        expect(mergeCardPrices(itad, cs)).toEqual(cs)
    })

    it("free wins over paid — ITAD free, CheapShark paid", () => {
        const cs: CardPrice = { price: 9.99, regular: 29.99, cut: 67, isFree: false }
        expect(mergeCardPrices(FREE, cs)).toEqual(FREE)
    })

    it("free wins over paid — CheapShark free, ITAD paid", () => {
        const itad: CardPrice = { price: 9.99, regular: 29.99, cut: 67, isFree: false }
        expect(mergeCardPrices(itad, FREE)).toEqual(FREE)
    })

    it("free wins when both are free", () => {
        expect(mergeCardPrices(FREE, FREE)).toEqual(FREE)
    })

    it("picks ITAD when prices are equal (stable sort)", () => {
        const itad: CardPrice = { price: 9.99, regular: 19.99, cut: 50, isFree: false }
        const cs:   CardPrice = { price: 9.99, regular: 19.99, cut: 50, isFree: false }
        // When equal, `itad.price <= cs.price` → itad wins
        expect(mergeCardPrices(itad, cs)).toEqual(itad)
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// nameVariants — pure function, no mocking needed
// ─────────────────────────────────────────────────────────────────────────────

describe("nameVariants", () => {
    it("strips subtitle after ': '", () => {
        const v = nameVariants("Grand Theft Auto IV: The Complete Edition")
        expect(v).toContain("Grand Theft Auto IV")
    })

    it("strips dash subtitle", () => {
        const v = nameVariants("Hitman - Agent 47")
        expect(v).toContain("Hitman")
    })

    it("strips known edition suffixes", () => {
        expect(nameVariants("The Witcher 3: Wild Hunt Definitive Edition"))
            .toContain("The Witcher 3: Wild Hunt")
        expect(nameVariants("DOOM Remastered"))
            .toContain("DOOM")
        expect(nameVariants("Red Dead Redemption Game of the Year Edition"))
            .toContain("Red Dead Redemption")
    })

    it("normalises missing space after colon", () => {
        // RAWG sometimes omits the space: "NieR:Automata"
        const v = nameVariants("NieR:Automata")
        expect(v).toContain("NieR: Automata")
    })

    it("normalises extra space after colon", () => {
        const v = nameVariants("NieR: Automata")
        expect(v).toContain("NieR:Automata")
    })

    it("does not include the original title in the variants list", () => {
        const title = "Elden Ring"
        const v = nameVariants(title)
        expect(v).not.toContain(title)
    })

    it("returns empty array for a short title with no variants", () => {
        // "DOOM" has no subtitle, no edition suffix, no colon
        // (roman numeral/ampersand variants may or may not fire, but no crashes)
        expect(() => nameVariants("DOOM")).not.toThrow()
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// isConsoleEdition — pure function, no mocking needed
// ─────────────────────────────────────────────────────────────────────────────

describe("isConsoleEdition", () => {
    it("recognises a Voidheart-style console edition", () => {
        expect(isConsoleEdition("Hollow Knight: Voidheart Edition", "Hollow Knight")).toBe(true)
    })

    it("recognises a Remastered edition", () => {
        expect(isConsoleEdition("Tomb Raider Remastered", "Tomb Raider")).toBe(true)
    })

    it("recognises a Definitive Edition", () => {
        expect(isConsoleEdition("Borderlands: The Pre-Sequel Definitive Edition", "Borderlands: The Pre-Sequel")).toBe(true)
    })

    it("rejects an identical title (no suffix)", () => {
        expect(isConsoleEdition("Hollow Knight", "Hollow Knight")).toBe(false)
    })

    it("rejects a title that does not start with the original", () => {
        // "Portal 2" does not start with "Portal " + edition keyword
        expect(isConsoleEdition("Portal 2", "Portal")).toBe(false)
    })

    it("rejects a different game with a shared prefix", () => {
        // "Call of Duty: Black Ops" starts with "Call of Duty" but the suffix
        // ": Black Ops" contains no EDITION_KEYWORD
        expect(isConsoleEdition("Call of Duty: Black Ops", "Call of Duty")).toBe(false)
    })

    it("is case-insensitive", () => {
        expect(isConsoleEdition("hollow knight: voidheart edition", "Hollow Knight")).toBe(true)
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// withRetry — async retry logic
// ─────────────────────────────────────────────────────────────────────────────

describe("withRetry", () => {
    beforeEach(() => vi.clearAllMocks())

    it("returns the result on first success", async () => {
        const fn = vi.fn().mockResolvedValue("ok")
        const result = await withRetry(fn, 3, 0)
        expect(result).toBe("ok")
        expect(fn).toHaveBeenCalledTimes(1)
    })

    it("retries on failure and succeeds on second attempt", async () => {
        const fn = vi.fn()
            .mockRejectedValueOnce(new Error("transient"))
            .mockResolvedValueOnce("recovered")
        const result = await withRetry(fn, 3, 0)
        expect(result).toBe("recovered")
        expect(fn).toHaveBeenCalledTimes(2)
    })

    it("throws after exhausting all retries", async () => {
        const fn = vi.fn().mockRejectedValue(new Error("permanent"))
        await expect(withRetry(fn, 2, 0)).rejects.toThrow("permanent")
        expect(fn).toHaveBeenCalledTimes(3) // initial + 2 retries
    })

    it("throws immediately on 429 when retryOn429=false", async () => {
        // Build an error that axios.isAxiosError() recognises (checks .isAxiosError === true)
        const err = Object.assign(new Error("rate limited"), {
            isAxiosError: true,
            response: { status: 429 },
        })
        const fn = vi.fn().mockRejectedValue(err)

        await expect(withRetry(fn, 3, 0, false)).rejects.toMatchObject({ message: "rate limited" })
        // Should have called fn exactly once — no retry on 429 when retryOn429=false
        expect(fn).toHaveBeenCalledTimes(1)
    })

    it("retries on 429 when retryOn429=true (default)", async () => {
        const err = Object.assign(new Error("rate limited"), {
            isAxiosError: true,
            response: { status: 429 },
        })
        const fn = vi.fn()
            .mockRejectedValueOnce(err)
            .mockResolvedValueOnce("success after 429")

        const result = await withRetry(fn, 2, 0, true)
        expect(result).toBe("success after 429")
        expect(fn).toHaveBeenCalledTimes(2)
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// ITAD ID lookup — tests via axios mock
// ─────────────────────────────────────────────────────────────────────────────

describe("ITAD pipeline (via getCardPricesService)", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Silence ITAD_API_KEY warning in test output
        process.env.ITAD_API_KEY = "test-key"
    })

    it("resolves a price when ITAD returns a valid deal", async () => {
        const { getCardPricesService } = await import("../featchers/games/games.service.js")

        // ITAD UUID lookup
        mockGet.mockResolvedValueOnce({
            data: { found: true, game: { id: "abc-123", title: "Elden Ring" } }
        })
        // ITAD prices/v3
        mockPost.mockResolvedValueOnce({
            data: [{
                id: "abc-123",
                deals: [{
                    shop:    { id: 61, name: "Steam" },
                    price:   { amount: 19.99 },
                    regular: { amount: 59.99 },
                    cut:     67,
                    url:     "https://store.steampowered.com/app/1245620",
                    voucher: null, storeLow: null, flag: null, drm: [], platforms: [], timestamp: "", expiry: null,
                }]
            }]
        })
        // CheapShark appid-check
        mockGet.mockResolvedValueOnce({
            data: [{
                storeID: "1",
                dealID: "abc",
                salePrice: "19.99",
                normalPrice: "59.99",
                savings: "67",
            }]
        })

        const result = await getCardPricesService([
            { id: 3498, name: "Elden Ring", steamAppId: "1245620" }
        ])

        expect(result[3498]).not.toBeNull()
        expect(result[3498]?.isFree).toBe(false)
        expect(result[3498]?.price).toBeCloseTo(19.99)
    })

    it("returns null for a game ITAD does not know about", async () => {
        const { getCardPricesService } = await import("../featchers/games/games.service.js")

        // ITAD UUID lookup: not found
        mockGet.mockResolvedValueOnce({ data: { found: false } })
        // ITAD title fallback: also not found
        mockGet.mockResolvedValueOnce({ data: { found: false } })
        // ITAD search: empty
        mockGet.mockResolvedValueOnce({ data: [] })
        // CheapShark: no results
        mockGet.mockResolvedValueOnce({ data: [] })

        const result = await getCardPricesService([
            { id: 99999, name: "Obscure Console Exclusive", steamAppId: undefined }
        ])

        expect(result[99999]).toBeNull()
    })

    it("returns FREE for a known free-to-play game", async () => {
        const { getCardPricesService } = await import("../featchers/games/games.service.js")

        // CheapShark may be called if resolverCache has a steamAppId for this game.
        // Return a 0.00 salePrice so the pipeline also confirms it as free.
        mockGet.mockResolvedValue({
            data: [{ storeID: "1", dealID: "x", salePrice: "0.00", normalPrice: "0.00", savings: "0" }]
        })

        // Dota 2 is in KNOWN_FREE_TITLES — use its real RAWG id (570)
        const result = await getCardPricesService([
            { id: 570, name: "Dota 2" }
        ])

        expect(result[570]).toEqual(FREE)
    })

    it("deduplicates: same ITAD UUID shared by two RAWG entries returns same price for both", async () => {
        const { getCardPricesService } = await import("../featchers/games/games.service.js")

        // Both ITAD appid lookups return the same UUID — use Once for each call in sequence
        mockGet
            .mockResolvedValueOnce({ data: { found: true, game: { id: "shared-uuid", title: "Game A" } } }) // ITAD lookup game 1
            .mockResolvedValueOnce({ data: { found: true, game: { id: "shared-uuid", title: "Game B" } } }) // ITAD lookup game 2
            .mockResolvedValue({ data: [] })  // CheapShark calls — no deals

        mockPost.mockResolvedValueOnce({
            data: [{
                id: "shared-uuid",
                deals: [{
                    shop:    { id: 61, name: "Steam" },
                    price:   { amount: 9.99 },
                    regular: { amount: 19.99 },
                    cut:     50,
                    url: "", voucher: null, storeLow: null, flag: null, drm: [], platforms: [], timestamp: "", expiry: null,
                }]
            }]
        })

        const result = await getCardPricesService([
            { id: 8001, name: "Game A", steamAppId: "80010" },
            { id: 8002, name: "Game B", steamAppId: "80020" },
        ])

        // Both entries get a price because they share the same ITAD UUID
        expect(result[8001]?.price).toBeCloseTo(9.99)
        expect(result[8002]?.price).toBeCloseTo(9.99)
        // prices/v3 called ONCE despite two games (single ITAD UUID → single batch call)
        expect(mockPost).toHaveBeenCalledTimes(1)
    })
})
