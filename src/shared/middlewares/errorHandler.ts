import { Request, Response, NextFunction } from "express"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
    console.error(err)

    //  Validation Error
    if (err.name === "ValidationError") {
        const errors = Object.values(err.errors).map((e: any) => ({
            field: e.path,
            message: e.message
        }))
        res.status(400).json({
            status: "400",
            message: "Validation error",
            data: errors
        })
        return
    }

    //invalid ObjectId
    if (err.name === "CastError") {
        res.status(404).json({
            status: "404",
            message: `Invalid ${err.path}: ${err.value}`,
            data: null
        })
        return
    }

    //   Duplicate Key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0]
        res.status(409).json({
            status: "409",
            message: `${field} already exists`,
            data: null
        })
        return
    }

    if (err.name === "JsonWebTokenError") {
        res.status(401).json({
            status: "401",
            message: "Invalid token",
            data: null
        })
        return
    }

    if (err.name === "TokenExpiredError") {
        res.status(401).json({
            status: "401",
            message: "Token expired, please login again",
            data: null
        })
        return
    }

    res.status(err.status || 500).json({
        status: err.status || "500",
        message: err.message || "Internal server error",
        // stack trace only in development
        data: process.env.NODE_ENV === "development" ? err.stack : null
    })
}

export default errorHandler