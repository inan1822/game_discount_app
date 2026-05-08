import { Types, Document } from "mongoose";
declare global {
    export interface IAddress {
        _id?: Types.ObjectId;
        street: string;
        city: string;
        country: string;
        zipCode: string;
    }
    export interface IUser extends Document {
        token: string;
        name: string;
        email: string;
        password: string;
        sendVerificationCode?: string;
        isVerified: boolean;
        sendVerificationCodeExpiry?: Date;
        twoFactorCode?: string;
        twoFactorExpiry?: Date;
        resetPasswordToken?: string;
        resetPasswordExpiry?: Date;
        role: "customer" | "admin";
        addresses: IAddress[];
        cart: ICartItem[];
        createdAt: Date;
        updatedAt: Date;
    }
}
//# sourceMappingURL=user.type.d.ts.map