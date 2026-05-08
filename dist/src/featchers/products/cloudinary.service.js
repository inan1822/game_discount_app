import cloudinary from "../../config/cloudinary.js";
// מעלה לתקייה IMAGE בעזרת Buffer
export async function uploadToCloud(buffer, folder = "Image") {
    //    רק שמות
    // אחד מחזיר מידע חיובי והשני מחזיר מידע שלילי  
    return new Promise((resolve, reject) => {
        // להזרים את התמונה ישירות מה־buffer של Multer → אל Cloudinary
        const stream = cloudinary.uploader.upload_stream({
            // תצור לי את התמונ בשם שהגדרתי (IMAGE)
            folder,
            resource_type: 'image'
        }, (error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result);
            }
        });
        stream.end(buffer);
    });
}
// מחיקה
// export const deleteImage = async() => {}
export async function deleteImage(publicId) {
    return cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}
//# sourceMappingURL=cloudinary.service.js.map