import { Document, Types } from "mongoose";
declare global {
    export interface IAddress {
        street: string;
        city: string;
        country: string;
        zipCode: string;
    }
    export interface IOrderItem {
        productId: Types.ObjectId;
        name: string;
        price: number;
        quantity: number;
        image?: string;
    }
    export interface IOrder extends Document {
        orderedBy: Types.ObjectId;
        items: IOrderItem[];
        address: IAddress;
        totalPrice: number;
        shippingCost?: number;
        paymentMethod: string;
        paymentStatus: "pending" | "paid" | "failed";
        orderStatus: "processing" | "shipped" | "delivered" | "cancelled";
        trackingNumber?: string;
        notes?: string;
        createdAt: Date;
        updatedAt: Date;
    }
}
//# sourceMappingURL=Order.type.d.ts.map