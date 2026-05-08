import joi from "joi";
export const registerSchema = joi.object({
    name: joi.string().min(2).max(40).required(),
    email: joi.string().email().required(),
    password: joi.string().min(8).required(),
    role: joi.string().valid("customer", "admin").default("customer")
}).options({ stripUnknown: true });
export const loginSchema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().min(8).required()
}).options({ stripUnknown: true });
export const verifyEmailSchema = joi.object({
    email: joi.string().email().required(),
    code: joi.string().length(6).pattern(/^\d+$/).required()
}).options({ stripUnknown: true });
export const verifyTwoFactorSchema = joi.object({
    email: joi.string().email().required(),
    code: joi.string().length(6).pattern(/^\d+$/).required()
}).options({ stripUnknown: true });
export const requestPasswordResetSchema = joi.object({
    email: joi.string().email().required()
}).options({ stripUnknown: true });
export const resetPasswordSchema = joi.object({
    token: joi.string().required(),
    newPassword: joi.string().min(8).required(),
    confirmPassword: joi.string().valid(joi.ref("newPassword")).required()
        .messages({ "any.only": "Passwords do not match" })
}).options({ stripUnknown: true });
//# sourceMappingURL=auth.schemas.js.map