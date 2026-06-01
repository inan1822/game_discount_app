import { MongoMemoryServer } from "mongodb-memory-server"
import mongoose from "mongoose"
import { afterAll, beforeAll } from "vitest"

let mongod: MongoMemoryServer

beforeAll(async () => {
    // Set env vars BEFORE any module that reads them at import time
    process.env.JWT_SECRET         = "test-secret-at-least-32-characters-long"
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret-32-chars-long!!"
    process.env.NODE_ENV           = "test"
    // Prevent mailer from actually sending emails in tests
    process.env.EMAIL_USER = "test@test.com"
    process.env.EMAIL_PASS = "testpass"

    mongod = await MongoMemoryServer.create()
    await mongoose.connect(mongod.getUri())
})

afterAll(async () => {
    await mongoose.disconnect()
    await mongod.stop()
})
