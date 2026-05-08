import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import userModel from "../../featchers/users/User.model.js"
import { NextFunction, Request, Response } from "express"
import { string } from "joi"


dotenv.config()

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void | Response | NextFunction | Request> => {
    try {
        const authHeader = req.headers.authorization
        const inputToken = authHeader?.split(" ")[1]
        if (!inputToken) {
            return res.status(401).json({
                status: "401",
                message: "Access Denied: No Token Provided"
            });
        }

        const decoded = jwt.verify(inputToken, process.env.JWT_SECRET!) as { id: string, role: string }
        const user = await userModel.findById(decoded.id)
        if (!user || user.token !== inputToken) {
            return res.status(401).json({ message: "Token is invalid or expired" })
        }
        req.user = decoded

        next();

    } catch (error) {
        // אם הטוקן לא תקין או פג תוקף
        res.status(403).json({
            status: "401",
            message: "Invalid or Expired Token",
            data: (error as Error).message
        })

    }
}


