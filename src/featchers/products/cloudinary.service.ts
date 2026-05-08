import cloudinary from "../../config/cloudinary.js"
// מעלה לתקייה IMAGE בעזרת Buffer
export async function uploadToCloud(buffer: Buffer, folder: string = "Image"): Promise<{
    secure_url: string, public_id: string
}> {
    //    רק שמות
    // אחד מחזיר מידע חיובי והשני מחזיר מידע שלילי  
    return new Promise((resolve, reject) => {
        // להזרים את התמונה ישירות מה־buffer של Multer → אל Cloudinary
        const stream = cloudinary.uploader.upload_stream({
            // תצור לי את התמונ בשם שהגדרתי (IMAGE)
            folder,
            resource_type: 'image'
        },
            (error, result) => {
                if (error) {
                    reject(error)
                }
                else {
                    resolve(result!)
                }

            })
        stream.end(buffer)
    })

}

// מחיקה
// export const deleteImage = async() => {}
export async function deleteImage(publicId: string): Promise<unknown> {
    return cloudinary.uploader.destroy(publicId, { resource_type: "image" })

}