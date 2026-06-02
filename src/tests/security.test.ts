import { afterEach, describe, expect, it } from "vitest"
import crypto from "crypto"
import { request, seedUser, clearDB } from "./helpers.js"
import userModel from "../featchers/users/User.model.js"

afterEach(clearDB)

// Mirrors hashCode() in auth.service — the reset token is stored as its SHA-256 hash.
const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex")

// ── Account ban enforcement (P1 fix) ─────────────────────────────────────────
// A ban must block both new logins AND already-issued sessions.
describe("Account ban enforcement", () => {
    it("blocks a banned user from logging in (403)", async () => {
        await userModel.create({
            name:       "Banned User",
            email:      "banned@test.com",
            password:   "Password123!",
            isVerified: true,
            isBanned:   true,
        })

        const res = await request
            .post("/api/v1/auth/login")
            .send({ email: "banned@test.com", password: "Password123!" })

        expect(res.status).toBe(403)
    })

    it("rejects an already-issued session as soon as the user is banned (403)", async () => {
        const { cookie, userId } = await seedUser({ email: "tobeban@test.com" })

        // The session works before the ban.
        const before = await request.get("/api/v1/auth/me").set("Cookie", cookie)
        expect(before.status).toBe(200)

        // Admin bans the user.
        await userModel.updateOne({ _id: userId }, { $set: { isBanned: true } })

        // The same (otherwise-valid, unexpired) cookie is now rejected.
        const after = await request.get("/api/v1/auth/me").set("Cookie", cookie)
        expect(after.status).toBe(403)
    })
})

// ── Password-reset session revocation (P2 fix) ───────────────────────────────
// Resetting the password must invalidate any active session (kick out a thief).
describe("Password reset revokes existing sessions", () => {
    it("invalidates the old session and rotates the password", async () => {
        const { cookie, userId, email } = await seedUser({
            email:    "reset@test.com",
            password: "OldPassword123!",
        })

        // The pre-reset session is valid.
        const before = await request.get("/api/v1/auth/me").set("Cookie", cookie)
        expect(before.status).toBe(200)

        // Stage a known reset token directly (the service only stores its hash).
        const resetToken = "known-reset-token-1234567890"
        await userModel.updateOne(
            { _id: userId },
            {
                $set: {
                    resetPasswordToken:  sha256(resetToken),
                    resetPasswordExpiry: new Date(Date.now() + 60 * 60 * 1000),
                },
            },
        )

        const reset = await request
            .post("/api/v1/auth/reset-password")
            .send({
                token:           resetToken,
                newPassword:     "NewPassword123!",
                confirmPassword: "NewPassword123!",
            })
        expect(reset.status).toBe(200)

        // The pre-reset cookie no longer grants access (token was revoked).
        const after = await request.get("/api/v1/auth/me").set("Cookie", cookie)
        expect(after.status).toBe(401)

        // The new password works; the old one does not.
        const newLogin = await request
            .post("/api/v1/auth/login")
            .send({ email, password: "NewPassword123!" })
        expect(newLogin.status).toBe(200)

        const oldLogin = await request
            .post("/api/v1/auth/login")
            .send({ email, password: "OldPassword123!" })
        expect(oldLogin.status).toBe(401)
    })
})
