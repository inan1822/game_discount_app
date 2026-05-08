import mongoose from "mongoose"
import dotenv from "dotenv"
import { promises } from "nodemailer/lib/xoauth2/index.js"

dotenv.config()

const mongoConnect = async (): Promise<void> => {
    try {
        await mongoose.connect(process.env.MONGO_URI!, {
            serverSelectionTimeoutMS: 5000,
        })
        console.log("MongoDB connected successfully ")
    } catch (error) {
        if (error instanceof Error) {
            console.log("cant connect to mongoo:", error)

            setTimeout(mongoConnect, 5000)
        }
    }
}

export default mongoConnect