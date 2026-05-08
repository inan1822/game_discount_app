import { registerService, verifyEmailService, loginService, verifyTwoFactorService, logoutService, getMeService, requestPasswordResetService, resetPasswordService } from "./auth.service.js";
import { getErrorInfo } from "../../shared/utils/AppError.js";
export const register = async (req, res) => {
    try {
        const newUser = await registerService(req.body);
        res.status(201).json({
            status: "201",
            message: "User created successfully",
            data: "check your email for verification"
        });
    }
    catch (error) {
        const { status, message } = getErrorInfo(error);
        res.status(status).json({
            status: String(status),
            message,
            data: null
        });
    }
};
export const verifyEmail = async (req, res) => {
    try {
        const result = await verifyEmailService(req.body);
        res.status(200).json(result);
    }
    catch (error) {
        const { status, message } = getErrorInfo(error);
        res.status(status).json({
            status: String(status),
            message,
            data: null
        });
    }
};
export const login = async (req, res) => {
    try {
        const result = await loginService(req.body);
        if (result.requiresTwoFactor) {
            return res.status(200).json({
                message: "2FA code sent to your email"
            });
        }
        res.status(200).json({
            status: "200",
            message: "Logged in",
            data: {
                token: result.token,
                userID: result.userID
            }
        });
    }
    catch (error) {
        const { status, message } = getErrorInfo(error);
        res.status(status).json({
            status: String(status),
            message,
            data: null
        });
    }
};
export const verifyTwoFactor = async (req, res) => {
    try {
        const result = await verifyTwoFactorService(req.body);
        res.status(200).json({
            message: "Login successful as admin",
            token: result.token
        });
    }
    catch (error) {
        const { status, message } = getErrorInfo(error);
        res.status(status).json({
            status: String(status),
            message,
            data: null
        });
    }
};
export const logout = async (req, res) => {
    try {
        await logoutService(req.user.id);
        res.status(200).json({
            status: "200",
            message: "Logged out successfully",
            data: null
        });
    }
    catch (error) {
        const { message, status } = getErrorInfo(error);
        res.status(status).json({
            status: String(status),
            message,
            data: null
        });
    }
};
export const getMe = async (req, res) => {
    try {
        const user = await getMeService(req.user.id);
        res.status(200).json({
            status: "200",
            message: "User fetched successfully",
            data: user
        });
    }
    catch (error) {
        const { status, message } = getErrorInfo(error);
        res.status(status).json({
            status: String(status),
            message,
            data: null
        });
    }
};
export const requestPasswordReset = async (req, res) => {
    try {
        const result = await requestPasswordResetService(req.body);
        res.status(200).json(result);
    }
    catch (error) {
        const { status, message } = getErrorInfo(error);
        res.status(status).json({
            status: String(status),
            message,
            data: null
        });
    }
};
export const resetPassword = async (req, res) => {
    try {
        const result = await resetPasswordService(req.body);
        res.status(200).json(result);
    }
    catch (error) {
        const { status, message } = getErrorInfo(error);
        res.status(status).json({
            status: String(status),
            message,
            data: null
        });
    }
};
//# sourceMappingURL=auth.controller.js.map