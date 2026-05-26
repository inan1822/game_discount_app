import {
    registerService,
    verifyEmailService,
    resendVerificationService,
    loginService,
    verifyTwoFactorService,
    logoutService,
    getMeService,
    requestPasswordResetService,
    resetPasswordService
} from "./auth.service.js"
import { Request, Response } from "express"
import { getErrorInfo } from "../../shared/utils/AppError.js"

/** Write the JWT into an httpOnly cookie so JS can never read it. */
function setAuthCookie(res: Response, token: string): void {
    res.cookie("dislow_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 2 * 60 * 60 * 1000,  // 2 h — matches JWT expiry
    })
}


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

export const resendVerification = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await resendVerificationService(req.body.email)
        res.status(200).json({ status: "200", message: result.message, data: null })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await loginService(req.body)

        if (result.requiresTwoFactor) {
            res.status(200).json({ message: "2FA code sent to your email" })
            return
        }

        setAuthCookie(res, result.token)
        res.status(200).json({
            status: "200",
            message: "Logged in",
            data: { userID: result.userID }
        })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const verifyTwoFactor = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await verifyTwoFactorService(req.body)
        setAuthCookie(res, result.token)
        // Token is also returned in the body so external auth integrations
        // (e.g. next-auth in the CRM) can place it in their session — the
        // cookie still covers same-origin storefront flows.
        res.status(200).json({
            status: "200",
            message: "Login successful as admin",
            data: { token: result.token, userID: result.userID, role: "admin" }
        })
    } catch (error) {
        const { status, message } = getErrorInfo(error)
        res.status(status).json({ status: String(status), message, data: null })
    }
}

export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        await logoutService(req.user!.id)
        res.clearCookie("dislow_token")
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
        const user = await getMeService(req.user!.id)
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
        const result = await requestPasswordResetService(req.body.email)
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