import { Document, Types } from "mongoose";
declare global {
    export interface rating {
        user: Types.ObjectId;
        rating: number;
        comment: string;
    }
    export interface IProduct extends Document {
        createdBy: Types.ObjectId;
        price: number;
        min: 0;
        title: string;
        description: string;
        category: string;
        stock: number;
        sold?: number;
        isActive?: boolean;
        rating: rating[];
        averageRating: number;
        imageUrl?: string | null;
        imagePublicId?: string | null;
        createdAt: Date;
        updatedAt: Date;
    }
}
//# sourceMappingURL=product.type.d.ts.map