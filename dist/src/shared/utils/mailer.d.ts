export declare const sendVerificationEmail: (to: string, code: string) => Promise<void>;
export declare const sendResetPasswordEmail: (to: string, code: string) => Promise<void>;
export declare const sendOrderEmail: (to: string, orderId: string, totalPrice: number, items: {
    name: string;
    price: number;
    quantity: number;
    image?: string;
}[]) => Promise<void>;
export declare const sendOrderStatusEmail: (to: string, orderId: string, newStatus: string) => Promise<void>;
//# sourceMappingURL=mailer.d.ts.map