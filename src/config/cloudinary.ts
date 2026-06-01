import { v2 as cloudinary } from 'cloudinary';

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME ?? process.env.cloud_name
const API_KEY    = process.env.CLOUDINARY_API_KEY    ?? process.env.api_key
const API_SECRET = process.env.CLOUDINARY_API_SECRET ?? process.env.api_secret

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    throw new Error('Missing Cloudinary environment variables')
}

cloudinary.config({ cloud_name: CLOUD_NAME, api_key: API_KEY, api_secret: API_SECRET })

export default cloudinary