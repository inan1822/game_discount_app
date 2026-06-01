import supertest from "supertest"
import { afterEach } from "vitest"
import mongoose from "mongoose"
import userModel from "../featchers/users/User.model.js"
import { app } from "../app.js"

export const request = supertest(app)

/** Wipe all collections between tests — call in afterEach of each test file */
export async function clearDB() {
    const collections = mongoose.connection.collections
    await Promise.all(Object.values(collections).map(c => c.deleteMany({})))
}

interface SeedOptions {
    email?:    string
    password?: string
    role?:     "user" | "admin"
}

/**
 * Seeds one user directly into MongoDB (bypasses email verification),
 * then logs them in via the real login endpoint and returns the Set-Cookie header.
 */
export async function seedUser(opts: SeedOptions = {}) {
    const email    = opts.email    ?? "test@dislow.com"
    const password = opts.password ?? "Password123!"
    const role     = opts.role     ?? "user"
    // Pass plain-text password — the User model's pre-save hook hashes it.
    // Do NOT pre-hash here; double-hashing breaks bcrypt.compare in loginService.
    const user = await userModel.create({
        name:       "Test User",
        email,
        password,
        role,
        isVerified: true,   // skip email verification in tests
    })

    const res = await request
        .post("/api/v1/auth/login")
        .send({ email, password })

    const cookie = (res.headers["set-cookie"] as string[] | undefined) ?? []

    return {
        email,
        password,
        userId: String(user._id),
        cookie,
    }
}
