export class AppError extends Error {
    status: number

    constructor(message: string, status: number) {
        super(message)
        this.status = status
    }
}

export function getErrorInfo(error: unknown): { status: number; message: string } {
    if (error instanceof Error) {
        const status = (error instanceof AppError) ? error.status : ((error as unknown as Record<string, unknown>).status as number | undefined) ?? 500
        return { status, message: error.message || "Internal server error" }
    }
    return { status: 500, message: "Internal server error" }
}

