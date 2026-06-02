import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import mongoose from "mongoose"

// Mock fulfillment so the retry test can force a transient failure deterministically.
// webhook.controller imports fulfillOrder from "../orders/fulfillment.js" — same module.
vi.mock("../featchers/orders/fulfillment.js", () => ({
    fulfillOrder: vi.fn(),
}))

import Stripe from "stripe"
import { request, clearDB } from "./helpers.js"
import { Order } from "../featchers/orders/Order.model.js"
import { WebhookEvent } from "../featchers/webhooks/WebhookEvent.model.js"
import { fulfillOrder } from "../featchers/orders/fulfillment.js"

const WEBHOOK_SECRET = "whsec_test_dislow_regression"
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy", {
    apiVersion: "2026-04-22.dahlia",
})
const mockFulfill = fulfillOrder as unknown as ReturnType<typeof vi.fn>

beforeAll(() => {
    // The controller reads STRIPE_WEBHOOK_SECRET per-request; sign with the same value.
    process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET
})

afterEach(async () => {
    await clearDB()
    vi.clearAllMocks()
})

function makeEvent(id: string, type: string, intentId: string) {
    return { id, type, data: { object: { id: intentId, object: "payment_intent" } } }
}

function postEvent(eventObj: object) {
    const payload = JSON.stringify(eventObj)
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET })
    return request
        .post("/api/v1/webhooks/stripe")
        .set("Content-Type", "application/json")
        .set("stripe-signature", signature)
        .send(payload)
}

describe("Stripe webhook", () => {
    it("rejects an invalid signature with 400", async () => {
        const res = await request
            .post("/api/v1/webhooks/stripe")
            .set("Content-Type", "application/json")
            .set("stripe-signature", "t=123,v1=deadbeef")
            .send(JSON.stringify(makeEvent("evt_bad", "payment_intent.succeeded", "pi_x")))
        expect(res.status).toBe(400)
    })

    it("accepts a signed event with no matching order (200)", async () => {
        const res = await postEvent(makeEvent("evt_noorder", "payment_intent.succeeded", "pi_none"))
        expect(res.status).toBe(200)
        expect(res.body.received).toBe(true)
    })

    it("deduplicates a re-delivered event", async () => {
        const event = makeEvent("evt_dup", "payment_intent.succeeded", "pi_none")

        const first = await postEvent(event)
        expect(first.status).toBe(200)
        expect(first.body.duplicate).toBeUndefined()

        const second = await postEvent(event)
        expect(second.status).toBe(200)
        expect(second.body.duplicate).toBe(true)

        // Recorded exactly once.
        expect(await WebhookEvent.countDocuments({ stripeEventId: "evt_dup" })).toBe(1)
    })

    it("re-processes on retry when fulfillment throws (does not record the failed event)", async () => {
        await Order.create({
            customerEmail:  "buyer@test.com",
            customerUserId: new mongoose.Types.ObjectId(),
            items: [{
                productId:   new mongoose.Types.ObjectId(),
                productName: "Test Game",
                quantity:    1,
                unitPrice:   20,
            }],
            totalAmount: 20,
            paymentRef:  "pi_retry",
            status:      "pending",
        })

        mockFulfill
            .mockRejectedValueOnce(new Error("transient DB error"))
            .mockResolvedValueOnce({ ok: true })

        const event = makeEvent("evt_retry", "payment_intent.succeeded", "pi_retry")

        // First delivery: fulfillment throws → 500, and the id is NOT recorded.
        const first = await postEvent(event)
        expect(first.status).toBe(500)
        expect(await WebhookEvent.exists({ stripeEventId: "evt_retry" })).toBeFalsy()

        // Stripe retries the same event: fulfillment succeeds → 200, now recorded.
        const second = await postEvent(event)
        expect(second.status).toBe(200)
        expect(await WebhookEvent.exists({ stripeEventId: "evt_retry" })).toBeTruthy()
        expect(mockFulfill).toHaveBeenCalledTimes(2)
    })
})
