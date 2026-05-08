import multer from "multer";
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // fileSize not filesize
    fileFilter: (req, file, callback) => {
        const allowedFiles = [
            "image/jpeg",
            "image/png",
            "image/jpg",
            "image/webp",
            "image/svg+xml" // svg+xml not svg
        ];
        if (allowedFiles.includes(file.mimetype)) {
            callback(null, true);
        }
        else {
            // @ts-ignore
            callback(new Error("Invalid file type"));
        }
    }
});
export const uploadsingle = upload.single("image");
export const uploadmultiple = upload.array("images", 5);
//# sourceMappingURL=Upload.middleware.js.map