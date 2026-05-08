export declare function uploadToCloud(buffer: Buffer, folder?: string): Promise<{
    secure_url: string;
    public_id: string;
}>;
export declare function deleteImage(publicId: string): Promise<unknown>;
//# sourceMappingURL=cloudinary.service.d.ts.map