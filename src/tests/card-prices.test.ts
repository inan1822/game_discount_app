import { afterEach, describe, expect, it, vi } from "vitest"
import { request, clearDB } from "./helpers.js"

// Mock external API calls — we test our batching/caching logic, not CheapShark uptime
vi.mock("axios", async (importOriginal) => {
    const actual = await importOriginal<typeof import("axios")>()
    return {
        ...actual,
        default: {
            ...(actual.default as object),
            get:  vi.fn().mockResolvedValue({ data: { prices: [], results: [] } }),
            post: vi.fn().mockResolvedValue({ data: [] }),
            head: vi.fn().mockResolvedValue({ status: 200 }),
        },
    }
})

afterEach(clearDB)

// card-prices is a public endpoint — no auth required
describe("POST /api/v1/games/card-prices", () => {
    it("returns 200 with an object keyed by gameId for a valid batch", async () => {
        const res = await request
            .post("/api/v1/games/card-prices")
            .send({
                games: [
                    { id: 3498,  name: "God of War",    steamAppId: 1593500 },
                    { id: 12020, name: "Left 4 Dead 2", steamAppId: 550 },
                ]
            })

        expect(res.status).toBe(200)
        expect(typeof res.body).toBe("object")
        expect(Array.isArray(res.body)).toBe(false)
    })

    it("returns 400 for empty games array", async () => {
        const res = await request
            .post("/api/v1/games/card-prices")
            .send({ games: [] })

        // Controller explicitly rejects empty arrays
        expect(res.status).toBe(400)
    })

    it("returns 400 when body is missing games key", async () => {
        const res = await request
            .post("/api/v1/games/card-prices")
            .send({ notGames: [] })

        expect(res.status).toBe(400)
    })
})
