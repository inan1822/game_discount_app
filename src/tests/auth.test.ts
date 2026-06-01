import { afterEach, describe, expect, it } from "vitest"
import { request, seedUser, clearDB } from "./helpers.js"

afterEach(clearDB)

// ── Register ──────────────────────────────────────────────────────────────────

describe("POST /api/v1/auth/register", () => {
    it("creates a new user and returns 201", async () => {
        const res = await request
            .post("/api/v1/auth/register")
            .send({ name: "Alice", email: "alice@test.com", password: "Password123!" })

        expect(res.status).toBe(201)
        expect(res.body.status).toBe("201")
    })

    it("returns 409 when email already registered", async () => {
        await request
            .post("/api/v1/auth/register")
            .send({ name: "Alice", email: "dupe@test.com", password: "Password123!" })

        const res = await request
            .post("/api/v1/auth/register")
            .send({ name: "Alice2", email: "dupe@test.com", password: "Password123!" })

        expect(res.status).toBe(409)
    })

    it("returns 400 for missing required fields", async () => {
        const res = await request
            .post("/api/v1/auth/register")
            .send({ email: "nope@test.com" }) // missing name + password

        expect(res.status).toBe(400)
    })
})

// ── Login ─────────────────────────────────────────────────────────────────────

describe("POST /api/v1/auth/login", () => {
    it("returns 200 and sets dislow_token cookie on correct credentials", async () => {
        await seedUser({ email: "login@test.com", password: "Password123!" })

        const res = await request
            .post("/api/v1/auth/login")
            .send({ email: "login@test.com", password: "Password123!" })

        expect(res.status).toBe(200)

        const cookies = (res.headers["set-cookie"] as string[]) ?? []
        const hasCookie = cookies.some(c => c.startsWith("dislow_token="))
        expect(hasCookie).toBe(true)
    })

    it("returns 401 for wrong password", async () => {
        await seedUser({ email: "wp@test.com", password: "CorrectPass!" })

        const res = await request
            .post("/api/v1/auth/login")
            .send({ email: "wp@test.com", password: "WrongPass!" })

        expect(res.status).toBe(401)
    })

    it("returns 401 for unknown email — prevents email enumeration", async () => {
        const res = await request
            .post("/api/v1/auth/login")
            .send({ email: "nobody@test.com", password: "anything" })

        // Must be 401, not 404 — 404 would reveal whether the email exists
        expect(res.status).toBe(401)
    })

    it("returns 400 for malformed request body", async () => {
        const res = await request
            .post("/api/v1/auth/login")
            .send({ email: "not-an-email", password: "x" })

        expect(res.status).toBe(400)
    })
})

// ── Get Me ────────────────────────────────────────────────────────────────────

describe("GET /api/v1/auth/me", () => {
    it("returns current user when authenticated", async () => {
        const { cookie } = await seedUser({ email: "me@test.com" })

        const res = await request
            .get("/api/v1/auth/me")
            .set("Cookie", cookie)

        expect(res.status).toBe(200)
        // Response envelope: { status, message, data: user }
        expect(res.body.data).toHaveProperty("email", "me@test.com")
        // Password hash must never appear in the response data
        expect(res.body.data).not.toHaveProperty("password")
    })

    it("returns 401 without cookie", async () => {
        const res = await request.get("/api/v1/auth/me")
        expect(res.status).toBe(401)
    })
})

// ── Logout ────────────────────────────────────────────────────────────────────

describe("POST /api/v1/auth/logout", () => {
    it("clears the auth cookie", async () => {
        const { cookie } = await seedUser()

        const res = await request
            .post("/api/v1/auth/logout")
            .set("Cookie", cookie)

        expect(res.status).toBe(200)

        const setCookies = (res.headers["set-cookie"] as string[]) ?? []
        const cleared = setCookies.some(c =>
            c.includes("dislow_token=;") || c.includes("Max-Age=0") || c.includes("Expires=Thu, 01 Jan 1970")
        )
        expect(cleared).toBe(true)
    })

    it("returns 401 if called without a session", async () => {
        const res = await request.post("/api/v1/auth/logout")
        expect(res.status).toBe(401)
    })

    it("rejects further requests with the cleared cookie", async () => {
        const { cookie } = await seedUser({ email: "gone@test.com" })

        await request.post("/api/v1/auth/logout").set("Cookie", cookie)

        // The same cookie should no longer grant access
        const meRes = await request.get("/api/v1/auth/me").set("Cookie", cookie)
        expect(meRes.status).toBe(401)
    })
})
