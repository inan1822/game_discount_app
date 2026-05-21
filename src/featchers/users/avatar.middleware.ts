import multer from "multer"
import { RequestHandler } from "express"

// Stricter than the shared Upload middleware:
//   - PNG and JPEG only (no webp/svg — those can embed arbitrary data)
//   - 2 MB limit (sharp will re-validate before Cloudinary)
const avatarUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === "image/png" || file.mimetype === "image/jpeg") {
            cb(null, true)
        } else {
            cb(new Error("Only PNG and JPEG images are allowed"))
        }
    },
})

export const uploadAvatarSingle: RequestHandler = avatarUpload.single("avatar")
