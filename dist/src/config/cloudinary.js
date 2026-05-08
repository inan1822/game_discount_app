import { v2 as cloudinary } from 'cloudinary';
if (!process.env.cloud_name || !process.env.api_key || !process.env.api_secret) {
    throw new Error('Missing Cloudinary environment variables');
}
// Configuration
cloudinary.config({
    cloud_name: process.env.cloud_name,
    api_key: process.env.api_key,
    api_secret: process.env.api_secret
});
export default cloudinary;
//# sourceMappingURL=cloudinary.js.map