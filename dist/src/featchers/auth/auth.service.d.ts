interface TwoFactorResponse {
    requiresTwoFactor: true;
}
interface LoginResponse {
    requiresTwoFactor: false;
    token: string;
    userID: any;
}
export declare const registerService: ({ name, email, password }: {
    name: string;
    email: string;
    password: string;
}) => Promise<import("mongoose").Document<unknown, {}, IUser, {}, import("mongoose").DefaultSchemaOptions> & IUser & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}>;
export declare const verifyEmailService: ({ email, code }: {
    email: string;
    code: string;
}) => Promise<string>;
export declare const loginService: ({ email, password }: {
    email: string;
    password: string;
}) => Promise<TwoFactorResponse | LoginResponse>;
export declare const verifyTwoFactorService: ({ email, code }: {
    email: string;
    code: string;
}) => Promise<{
    token: string;
}>;
export declare const logoutService: (userId: string) => Promise<void>;
export declare const getMeService: (userId: string) => Promise<IUser & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
export declare const requestPasswordResetService: (email: string) => Promise<{
    message: string;
}>;
export declare const resetPasswordService: ({ token, newPassword }: {
    token: string;
    newPassword: string;
}) => Promise<{
    message: string;
}>;
export {};
//# sourceMappingURL=auth.service.d.ts.map