import { afterEach, describe, expect, it } from "vitest"
import { request, seedUser, clearDB } from "./helpers.js"

afterEach(clearDB)

// All wishlist responses use the envelope { status, message, data }

const GAME = { gameId: "12345", gameName: "Elden Ring", gameCover: null, gameSlug: "elden-ring" }

// ── Auth guard ────────────────────────────────────────────────────────────────

describe("GET /api/v1/wishlist (auth guard)", () => {
    it("returns 401 without a session cookie", async () => {
        const res = await request.get("/api/v1/wishlist")
        expect(res.status).toBe(401)
    })
})

// ── Empty wishlist ─────────────────────────────────────────────────────────────

describe("GET /api/v1/wishlist", () => {
    it("returns empty array for a new user", async () => {
        const { cookie } = await seedUser()

        const res = await request
            .get("/api/v1/wishlist")
            .set("Cookie", cookie)

        expect(res.status).toBe(200)
        // data is the items array
        expect(Array.isArray(res.body.data)).toBe(true)
        expect(res.body.data).toHaveLength(0)
    })
})

// ── Add to wishlist ────────────────────────────────────────────────────────────

describe("POST /api/v1/wishlist", () => {
    it("adds a game and returns 201", async () => {
        const { cookie } = await seedUser()

        const res = await request
            .post("/api/v1/wishlist")
            .set("Cookie", cookie)
            .send(GAME)

        expect(res.status).toBe(201)

        const list = await request.get("/api/v1/wishlist").set("Cookie", cookie)
        expect(list.body.data).toHaveLength(1)
        expect(list.body.data[0]).toHaveProperty("gameName", "Elden Ring")
    })

    it("does not duplicate if the same game is added twice", async () => {
        const { cookie } = await seedUser()

        await request.post("/api/v1/wishlist").set("Cookie", cookie).send(GAME)
        await request.post("/api/v1/wishlist").set("Cookie", cookie).send(GAME)

        const list = await request.get("/api/v1/wishlist").set("Cookie", cookie)
        expect(list.body.data).toHaveLength(1)
    })

    it("returns 401 without auth", async () => {
        const res = await request.post("/api/v1/wishlist").send(GAME)
        expect(res.status).toBe(401)
    })
})

// ── Delete from wishlist ───────────────────────────────────────────────────────

describe("DELETE /api/v1/wishlist/:gameId", () => {
    it("removes a game successfully", async () => {
        const { cookie } = await seedUser()

        await request.post("/api/v1/wishlist").set("Cookie", cookie).send(GAME)

        const del = await request
            .delete(`/api/v1/wishlist/${GAME.gameId}`)
            .set("Cookie", cookie)

        expect(del.status).toBe(200)

        const list = await request.get("/api/v1/wishlist").set("Cookie", cookie)
        expect(list.body.data).toHaveLength(0)
    })

    it("is scoped per user — user B cannot delete user A's entry", async () => {
        const a = await seedUser({ email: "a@test.com" })
        const b = await seedUser({ email: "b@test.com" })

        await request.post("/api/v1/wishlist").set("Cookie", a.cookie).send(GAME)

        // User B tries to delete user A's game — should not succeed
        const del = await request
            .delete(`/api/v1/wishlist/${GAME.gameId}`)
            .set("Cookie", b.cookie)

        // removeFromWishlist looks up by userId + gameId, so it won't find user A's entry
        // It may return 200 with "not found" or 404 — either way, A's data must be intact
        const listA = await request.get("/api/v1/wishlist").set("Cookie", a.cookie)
        expect(listA.body.data).toHaveLength(1)
    })
})

// ── Check wishlist ─────────────────────────────────────────────────────────────

describe("GET /api/v1/wishlist/:gameId", () => {
    it("returns inWishlist: true when game is in wishlist", async () => {
        const { cookie } = await seedUser()
        await request.post("/api/v1/wishlist").set("Cookie", cookie).send(GAME)

        const res = await request
            .get(`/api/v1/wishlist/${GAME.gameId}`)
            .set("Cookie", cookie)

        expect(res.status).toBe(200)
        expect(res.body.data).toHaveProperty("inWishlist", true)
    })

    it("returns inWishlist: false when game is not in wishlist", async () => {
        const { cookie } = await seedUser()

        const res = await request
            .get("/api/v1/wishlist/99999")
            .set("Cookie", cookie)

        expect(res.status).toBe(200)
        expect(res.body.data).toHaveProperty("inWishlist", false)
    })
})
