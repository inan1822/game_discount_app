---
name: dislow-integration-tests
description: >
  Writes 10-15 integration tests for the DisLow Express backend covering auth flows,
  wishlist CRUD, and price fetching. Uses vitest + supertest + mongodb-memory-server
  (ESM-compatible, matches the project's "type: module" setup).
  Use this skill whenever the user wants to: add tests, write integration tests,
  test auth flows, test the API, set up a test suite, or asks "how do I test this".
  Also trigger on: "no tests", "add coverage", "test the backend", "vitest", "supertest",
  or any request to verify the Express API behaviour automatically.
  Run this before any refactor — tests catch regressions you can't see manually.
---

# DisLow Integration Tests

You are writing 10-15 integration tests for the Express backend in `src/`.
The tests spin up an in-memory MongoDB, seed test data, and hit the real Express
routes via HTTP — exactly what production traffic does, with no mocking of the DB layer.

---

## Step 1 — Install test dependencies

```bash
# From the repo root (where the backend package.json lives)
pnpm add -D vitest @vitest/coverage-v8 supertest mongodb-memory-server
pnpm add -D @types/supertest
```

---

## Step 2 — Configure vitest

Create `vitest.config.ts` at the repo root:

```ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/tests/setup.ts"],
    testTimeout: 30_000,   // mongodb-memory-server can be slow to start
    hookTimeout: 30_000,
    pool: "forks",         // required for ESM + mongodb-memory-server
  },
})
```

Add to the root `package.json` scripts:
```json
"test":     "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

---

## Step 3 — Create test setup file

Create `src/tests/setup.ts`:

```ts
import { MongoMemoryServer } from "mongodb-memory-server"
import mongoose from "mongoose"
import { afterAll, beforeAll } from "vitest"

let mongod: MongoMemoryServer

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
  
  // Set required env vars the app reads at startup
  process.env.JWT_SECRET = "test-secret-min-32-chars-long-please"
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-min-32-chars"
  process.env.NODE_ENV = "test"
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})
```

---

## Step 4 — Create test helpers

Create `src/tests/helpers.ts`:

```ts
import supertest from "supertest"
import bcrypt from "bcrypt"
import userModel from "../featchers/users/User.model.js"
import { app } from "../app.js"   // see note below

export const request = supertest(app)

/** Seeds one regular user and returns their login cookie */
export async function seedUser(overrides?: Partial<{ email: string; password: string }>) {
  const email    = overrides?.email    ?? "test@dislow.com"
  const password = overrides?.password ?? "password123"
  const hash     = await bcrypt.hash(password, 10)
  
  await userModel.create({
    name:     "Test User",
    email,
    password: hash,
    role:     "user",
    isVerified: true,
  })
  
  const res = await request
    .post("/api/v1/auth/login")
    .send({ email, password })
  
  // Return the Set-Cookie header so tests can pass it in subsequent requests
  const cookie = res.headers["set-cookie"] as string[]
  return { email, password, cookie, userId: res.body.user?._id as string }
}

/** Seeds one admin user */
export async function seedAdmin() {
  const email    = "admin@dislow.com"
  const password = "adminpass123"
  const hash     = await bcrypt.hash(password, 10)
  
  await userModel.create({
    name:     "Admin User",
    email,
    password: hash,
    role:     "admin",
    isVerified: true,
  })
  
  return { email, password }
}
```

**Note on `app.js`:** The Express app must be exported separately from `server.ts` so
tests can import it without starting the HTTP listener. If `server.ts` currently calls
`app.listen()` at the top level, refactor it:

```ts
// src/app.ts — export the configured Express app
export const app = express()
// ... all middleware and routes ...

// src/server.ts — entry point only
import { app } from "./app.js"
app.listen(5000, () => console.log("DisLow API running on port 5000"))
```

---

## Step 5 — Write the tests

Create `src/tests/auth.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest"
import mongoose from "mongoose"
import userModel from "../featchers/users/User.model.js"
import { request, seedUser } from "./helpers.js"

afterEach(async () => {
  // Clean users between tests so they don't bleed into each other
  await userModel.deleteMany({})
})

describe("POST /api/v1/auth/register", () => {
  it("creates a new user and returns 201", async () => {
    const res = await request
      .post("/api/v1/auth/register")
      .send({ name: "Alice", email: "alice@test.com", password: "password123" })
    
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty("message")
    
    const user = await userModel.findOne({ email: "alice@test.com" })
    expect(user).not.toBeNull()
    expect(user?.password).not.toBe("password123")  // must be hashed
  })

  it("returns 409 when email already exists", async () => {
    await seedUser({ email: "dupe@test.com" })
    
    const res = await request
      .post("/api/v1/auth/register")
      .send({ name: "Dupe", email: "dupe@test.com", password: "password123" })
    
    expect(res.status).toBe(409)
  })

  it("returns 400 for invalid email format", async () => {
    const res = await request
      .post("/api/v1/auth/register")
      .send({ name: "Bad", email: "not-an-email", password: "password123" })
    
    expect(res.status).toBe(400)
  })
})

describe("POST /api/v1/auth/login", () => {
  it("returns cookie and user on correct credentials", async () => {
    await seedUser({ email: "login@test.com", password: "mypassword" })
    
    const res = await request
      .post("/api/v1/auth/login")
      .send({ email: "login@test.com", password: "mypassword" })
    
    expect(res.status).toBe(200)
    expect(res.body.user).toHaveProperty("email", "login@test.com")
    
    const cookies = res.headers["set-cookie"] as string[]
    expect(cookies.some((c: string) => c.startsWith("dislow_token="))).toBe(true)
  })

  it("returns 401 for wrong password", async () => {
    await seedUser({ email: "wp@test.com", password: "correct" })
    
    const res = await request
      .post("/api/v1/auth/login")
      .send({ email: "wp@test.com", password: "wrong" })
    
    expect(res.status).toBe(401)
  })

  it("returns 401 for unknown email — does not reveal user existence", async () => {
    const res = await request
      .post("/api/v1/auth/login")
      .send({ email: "nobody@test.com", password: "anything" })
    
    // Must be 401, not 404 — 404 reveals email enumeration
    expect(res.status).toBe(401)
  })
})

describe("GET /api/v1/auth/me", () => {
  it("returns current user when authenticated", async () => {
    const { cookie } = await seedUser()
    
    const res = await request
      .get("/api/v1/auth/me")
      .set("Cookie", cookie)
    
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("email", "test@dislow.com")
    expect(res.body).not.toHaveProperty("password")  // never expose hash
  })

  it("returns 401 without cookie", async () => {
    const res = await request.get("/api/v1/auth/me")
    expect(res.status).toBe(401)
  })
})

describe("POST /api/v1/auth/logout", () => {
  it("clears the auth cookie", async () => {
    const { cookie } = await seedUser()
    
    const res = await request
      .post("/api/v1/auth/logout")
      .set("Cookie", cookie)
    
    expect(res.status).toBe(200)
    
    // Cookie should be cleared (Max-Age=0 or Expires in past)
    const setCookie = (res.headers["set-cookie"] as string[]) ?? []
    const cleared   = setCookie.some((c: string) =>
      c.includes("dislow_token=;") || c.includes("Max-Age=0")
    )
    expect(cleared).toBe(true)
  })
})
```

Create `src/tests/wishlist.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest"
import userModel from "../featchers/users/User.model.js"
import { request, seedUser } from "./helpers.js"

afterEach(async () => {
  await userModel.deleteMany({})
  // Also clear wishlist entries if they're a separate collection
  const WishlistModel = (await import("../featchers/wishlist/Wishlist.model.js")).default
  await WishlistModel.deleteMany({})
})

describe("GET /api/v1/wishlist", () => {
  it("returns 401 without auth", async () => {
    const res = await request.get("/api/v1/wishlist")
    expect(res.status).toBe(401)
  })

  it("returns empty array for new user", async () => {
    const { cookie } = await seedUser()
    const res = await request.get("/api/v1/wishlist").set("Cookie", cookie)
    
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

describe("POST /api/v1/wishlist", () => {
  it("adds a game to the wishlist", async () => {
    const { cookie } = await seedUser()
    
    const res = await request
      .post("/api/v1/wishlist")
      .set("Cookie", cookie)
      .send({ gameId: "12345", gameName: "Elden Ring", gameCover: null, gameSlug: "elden-ring" })
    
    expect(res.status).toBe(201)
    
    const list = await request.get("/api/v1/wishlist").set("Cookie", cookie)
    expect(list.body).toHaveLength(1)
    expect(list.body[0]).toHaveProperty("gameName", "Elden Ring")
  })

  it("does not duplicate if game already in wishlist", async () => {
    const { cookie } = await seedUser()
    const payload = { gameId: "12345", gameName: "Elden Ring", gameCover: null, gameSlug: "elden-ring" }
    
    await request.post("/api/v1/wishlist").set("Cookie", cookie).send(payload)
    await request.post("/api/v1/wishlist").set("Cookie", cookie).send(payload)
    
    const list = await request.get("/api/v1/wishlist").set("Cookie", cookie)
    expect(list.body).toHaveLength(1)
  })
})

describe("DELETE /api/v1/wishlist/:gameId", () => {
  it("removes a game from the wishlist", async () => {
    const { cookie } = await seedUser()
    
    await request
      .post("/api/v1/wishlist")
      .set("Cookie", cookie)
      .send({ gameId: "99", gameName: "Portal 2", gameCover: null, gameSlug: "portal-2" })
    
    const del = await request.delete("/api/v1/wishlist/99").set("Cookie", cookie)
    expect(del.status).toBe(200)
    
    const list = await request.get("/api/v1/wishlist").set("Cookie", cookie)
    expect(list.body).toHaveLength(0)
  })

  it("cannot delete another user's wishlist entry", async () => {
    const { cookie: cookieA } = await seedUser({ email: "a@test.com" })
    const { cookie: cookieB } = await seedUser({ email: "b@test.com" })
    
    await request
      .post("/api/v1/wishlist")
      .set("Cookie", cookieA)
      .send({ gameId: "77", gameName: "GTA V", gameCover: null, gameSlug: "gta-v" })
    
    // User B tries to delete user A's entry
    const del = await request.delete("/api/v1/wishlist/77").set("Cookie", cookieB)
    
    // Should be 404 (not found for this user) or 403
    expect([403, 404]).toContain(del.status)
    
    // User A's list must still have it
    const listA = await request.get("/api/v1/wishlist").set("Cookie", cookieA)
    expect(listA.body).toHaveLength(1)
  })
})
```

Create `src/tests/card-prices.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest"
import { request, seedUser } from "./helpers.js"

// Mock external API calls — we test OUR logic, not CheapShark's uptime
vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>()
  return {
    ...actual,
    default: {
      ...actual.default,
      get:  vi.fn().mockResolvedValue({ data: { prices: [] } }),
      post: vi.fn().mockResolvedValue({ data: [] }),
      head: vi.fn().mockResolvedValue({ status: 200 }),
    },
  }
})

describe("POST /api/v1/games/card-prices", () => {
  it("returns prices for a batch of games", async () => {
    const { cookie } = await seedUser()
    
    const res = await request
      .post("/api/v1/games/card-prices")
      .set("Cookie", cookie)
      .send([
        { id: 3498,  name: "God of War",    steamAppId: 1593500 },
        { id: 12020, name: "Left 4 Dead 2", steamAppId: 550      },
      ])
    
    // Should return an object keyed by gameId
    expect(res.status).toBe(200)
    expect(typeof res.body).toBe("object")
  })

  it("handles empty batch gracefully", async () => {
    const { cookie } = await seedUser()
    
    const res = await request
      .post("/api/v1/games/card-prices")
      .set("Cookie", cookie)
      .send([])
    
    expect(res.status).toBe(200)
    expect(res.body).toEqual({})
  })

  it("returns 400 if body is not an array", async () => {
    const { cookie } = await seedUser()
    
    const res = await request
      .post("/api/v1/games/card-prices")
      .set("Cookie", cookie)
      .send({ not: "an array" })
    
    expect(res.status).toBe(400)
  })
})
```

---

## Step 6 — Run the tests

```bash
# From the repo root
pnpm test
```

Fix any failures before declaring done. Common issues:
- `app.js` not exported separately → refactor server.ts as shown in Step 4
- mongoose model imported before connection → setup.ts runs beforeAll, models are lazy
- ESM import paths missing `.js` extension → add them (TypeScript+ESM requires explicit `.js`)

---

## Done when

- `pnpm test` runs all tests and passes
- No test imports from `lucide-react`, no UI tests (backend only)
- Each test cleans up after itself (afterEach deletes seeded data)
- The auth cross-user isolation test passes (user B cannot delete user A's data)
- `pnpm test:coverage` shows >60% line coverage on auth and wishlist routes
