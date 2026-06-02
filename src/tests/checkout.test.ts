import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Hoisted Stripe stubs so no real PaymentIntents are created during tests.
const { piCreate, piCancel } = vi.hoisted(() => ({
    piCreate: vi.fn(),
    piCancel: vi.fn(),
}))

vi.mock("stripe", () => ({
    default: class MockStripe {
        paymentIntents = { create: piCreate, cancel: piCancel }
        webhooks = { constructEvent: vi.fn(), generateTestHeaderString: vi.fn() }
    },
}))

// No real emails.
vi.mock("../shared/utils/mailer.js", () => ({
    sendVerificationEmail:     vi.fn().mockResolvedValue(undefined),
    sendResetPasswordEmail:    vi.fn().mockResolvedValue(undefined),
    sendKeyDeliveryEmail:      vi.fn().mockResolvedValue(undefined),
    sendPaidConfirmationEmail: vi.fn().mockResolvedValue(undefined),
    sendOrderEmail:            vi.fn().mockResolvedValue(undefined),
    sendOrderStatusEmail:      vi.fn().mockResolvedValue(undefined),
    transporter:               { sendMail: vi.fn().mockResolvedValue(undefined) },
}))

import { request, seedUser, clearDB } from "./helpers.js"
import { Product } from "../featchers/products/Product.model.js"
import { GameKey } from "../featchers/products/GameKey.model.js"
import { Order } from "../featchers/orders/Order.model.js"

afterEach(async () => {
    await clearDB()
    vi.clearAllMocks()
})

beforeEach(() => {
    piCreate.mockResolvedValue({ id: "pi_test_123", client_secret: "cs_test_123" })
})

function makeProduct(price: number) {
    return Product.create({
        name:     "Test Game Key",
        platform: "PC",
        category: "gamekey",
        price,
        isActive: true,
    })
}

describe("POST /api/v1/checkout", () => {
    it("requires authentication", async () => {
        const res = await request
            .post("/api/v1/checkout")
            .send({ productId: "000000000000000000000000" })
        expect(res.status).toBe(401)
    })

    it("delivers a free product immediately with its key and no Stripe call", async () => {
        const { cookie } = await seedUser({ email: "freebie@test.com" })
        const product = await makeProduct(0)
        await GameKey.create({ productId: product._id, code: "FREE-KEY-AAAA-BBBB", status: "available" })

        const res = await request
            .post("/api/v1/checkout")
            .set("Cookie", cookie)
            .send({ productId: product._id.toString() })

        expect(res.status).toBe(201)
        expect(res.body.data.isFree).toBe(true)
        expect(res.body.data.finalPrice).toBe(0)
        expect(res.body.data.gameKey).toBe("FREE-KEY-AAAA-BBBB")
        expect(piCreate).not.toHaveBeenCalled()

        // The key is consumed and the order is recorded as delivered.
        const key = await GameKey.findOne({ productId: product._id }).select("+code")
        expect(key?.status).toBe("sold")
        const order = await Order.findOne({ "items.productId": product._id })
        expect(order?.status).toBe("delivered")
    })

    it("returns 409 when the product is out of stock", async () => {
        const { cookie } = await seedUser({ email: "nostock@test.com" })
        const product = await makeProduct(0) // no keys created

        const res = await request
            .post("/api/v1/checkout")
            .set("Cookie", cookie)
            .send({ productId: product._id.toString() })

        expect(res.status).toBe(409)
    })

    it("charges the server-side DB price — a client-sent price is ignored", async () => {
        const { cookie } = await seedUser({ email: "payer@test.com" })
        const product = await makeProduct(20)
        await GameKey.create({ productId: product._id, code: "PAID-KEY-CCCC-DDDD", status: "available" })

        const res = await request
            .post("/api/v1/checkout")
            .set("Cookie", cookie)
            // Attacker attempts to inject their own price — must be ignored.
            .send({ productId: product._id.toString(), price: 1, amount: 1, finalPrice: 1 })

        expect(res.status).toBe(201)
        expect(res.body.data.isFree).toBe(false)
        expect(res.body.data.clientSecret).toBe("cs_test_123")
        // Stripe is charged the DB price ($20 → 2000 cents), not the injected $1.
        expect(piCreate).toHaveBeenCalledWith(
            expect.objectContaining({ amount: 2000, currency: "usd" }),
        )
    })
})
