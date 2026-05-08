export declare class AppError extends Error {
    status: number;
    constructor(message: string, status: number);
}
export declare function getErrorInfo(error: unknown): {
    status: number;
    message: string;
};
//# sourceMappingURL=AppError.d.ts.map