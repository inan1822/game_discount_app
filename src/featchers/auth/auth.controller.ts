import {
    registerService,
    verifyEmailService,
    loginService,
    verifyTwoFactorService,
    logoutService,
    getMeService,
    requestPasswordResetService,
    resetPasswordService
} from "./auth.service.js"
import { Request, Response } from "express"
import { getErrorInfo } from "../../shared/utils/AppError.js"


export const register = async (req: Request, res: Response): Promise<void> => {
    try {

        const newUser = await registerService(req.body)

        res.status(201).json({
            status: "201",
            message: "User created successfully",
            data: "check your email for verification"
        })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({
            status: String(status),
            message,
            data: null
        })
    }
}

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await verifyEmailService(req.body)
        res.status(200).json(result)
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({
            status: String(status),
            message,
            data: null
        })
    }
}

export const login = async (req: Request, res: Response) => {
    try {
        const result = await loginService(req.body)

        if (result.requiresTwoFactor) {
            return res.status(200).json({
                message: "2FA code sent to your email"
            })
        }

        res.status(200).json({
            status: "200",
            message: "Logged in",
            data: {
                token: result.token,
                userID: result.userID
            }
        })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({
            status: String(status),
            message,
            data: null
        })
    }
}

export const verifyTwoFactor = async (req: Request, res: Response) => {
    try {
        const result = await verifyTwoFactorService(req.body)
        res.status(200).json({
            message: "Login successful as admin",
            token: result.token
        })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({
            status: String(status),
            message,
            data: null
        })
    }
}

export const logout = async (req: Request, res: Response) => {
    try {
        await logoutService(req.user!.id)
        res.status(200).json({
            status: "200",
            message: "Logged out successfully",
            data: null
        })
    } catch (error) {
        const { message, status } = getErrorInfo(error)
        res.status(status).json({
            status: String(status),
            message,
            data: null
        })
    }
}

export const getMe = async (req: Request, res: Response) => {
    try {
        const user = await getMeService((req as any).user.id)
        res.status(200).json({
            status: "200",
            message: "User fetched successfully",
            data: user
        })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({
            status: String(status),
            message,
            data: null
        })
    }
}

export const requestPasswordReset = async (req: Request, res: Response) => {
    try {
        const result = await requestPasswordResetService(req.body)
        res.status(200).json(result)
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({
            status: String(status),
            message,
            data: null
        })
    }
}

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const result = await resetPasswordService(req.body)
        res.status(200).json(result)
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({
            status: String(status),
            message,
            data: null
        })
    }
}