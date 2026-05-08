export class AppError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}
export function getErrorInfo(error) {
    if (error instanceof Error) {
        const status = error.status ?? 500;
        return { status, message: error.message || "Internal server error" };
    }
    return { status: 500, message: "Internal server error" };
}
//# sourceMappingURL=AppError.js.map