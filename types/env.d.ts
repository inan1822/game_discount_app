declare global {
    namespace NodeJS {
        interface ProcessEnv {
            PORT: string
            NODE_ENV: "development" | "production"
            MONGO_URI: string
            JWT_SECRET: string
            EMAIL_USER: string
            EMAIL_PASS: string
            cloud_name: string
            api_key: string
            api_secret: string
            RAWG_API: string
            ITAD_CLIENT_ID: string
            ITAD_CLIENT_SECRET: string
        }
    }
}

export {}
