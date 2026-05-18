import { NextFunction, Request, Response } from "express"

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({
            status: "401",
            message: "Unauthorized",
            data: null
        })
    }

    if (req.user.role !== "admin") {
        return res.status(403).json({
            status: "403",
            message: "Access denied, admins only",
            data: null
        })
    }

    next()
}