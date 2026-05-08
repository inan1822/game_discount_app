import multer from "multer"
import { Request, RequestHandler } from "express"

const storage = multer.memoryStorage()

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },  // fileSize not filesize
    fileFilter: (req: Request, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
        const allowedFiles = [
            "image/jpeg",
            "image/png",
            "image/jpg",
            "image/webp",
            "image/svg+xml"              // svg+xml not svg
        ]
        if (allowedFiles.includes(file.mimetype)) {
            callback(null, true)
        } else {
            // @ts-ignore
            callback(new Error("Invalid file type"))
        }
    }
})

export const uploadsingle: RequestHandler = upload.single("image")
export const uploadmultiple: RequestHandler = upload.array("images", 5)