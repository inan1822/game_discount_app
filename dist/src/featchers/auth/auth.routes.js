import { register, login, verifyEmail, verifyTwoFactor, requestPasswordReset, resetPassword, getMe, logout } from "./auth.controller.js";
import { Router } from "express";
import { authMiddleware } from "../../shared/middlewares/shared.middlewares.js";
import { validateRequest } from "../../shared/middlewares/validateRequst.js";
import { registerSchema, loginSchema, verifyEmailSchema, verifyTwoFactorSchema, requestPasswordResetSchema, resetPasswordSchema } from "../../shared/validators/auth.schemas.js";
const authRouter = Router();
authRouter.post("/register", validateRequest(registerSchema, "body"), register);
authRouter.post("/verify", validateRequest(verifyEmailSchema, "body"), verifyEmail);
authRouter.post("/login", validateRequest(loginSchema, "body"), login);
authRouter.post("/admin", validateRequest(verifyTwoFactorSchema, "body"), verifyTwoFactor);
authRouter.post("/request-password-reset", validateRequest(requestPasswordResetSchema, "body"), requestPasswordReset);
authRouter.post("/reset-password", validateRequest(resetPasswordSchema, "body"), resetPassword);
authRouter.post("/logout", authMiddleware, logout);
authRouter.get("/me", authMiddleware, getMe);
export default authRouter;
//# sourceMappingURL=auth.routes.js.map