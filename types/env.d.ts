declare namespace NodeJs {
    interface ProcessEnv {
        MONGODB_URI: string
        JWT_SECRET: string
        EMAIL_USER: string
        EMAIL_PASS: string
        cloud_name: string
        api_key: string
        api_secret: string
    }

}