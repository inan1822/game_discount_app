import joi from "joi"

export const editProfileSchema = joi.object({
    name:            joi.string().min(2).max(40).pattern(/^[\w\s]+$/).messages({
        "string.pattern.base": "Name may only contain letters, numbers, and spaces",
    }),
    email:           joi.string().email().lowercase(),
    currentPassword: joi.string().min(6).required().messages({
        "any.required": "Current password is required to save changes",
    }),
}).or("name", "email").options({ stripUnknown: true })
    .messages({ "object.missing": "Provide at least one field to update (name or email)" })

export const changePasswordSchema = joi.object({
    currentPassword:    joi.string().min(6).required(),
    newPassword:        joi.string().min(8)
        .pattern(/(?=.*[a-zA-Z])(?=.*\d)/)
        .required()
        .messages({
            "string.pattern.base": "New password must contain at least one letter and one digit",
        }),
    confirmNewPassword: joi.string().valid(joi.ref("newPassword")).required().messages({
        "any.only": "Passwords do not match",
    }),
}).options({ stripUnknown: true })

export const confirmPendingEmailSchema = joi.object({
    code: joi.string().length(6).pattern(/^\d+$/).required(),
}).options({ stripUnknown: true })

export const deleteAccountSchema = joi.object({
    password:      joi.string().min(1).required().messages({ "any.required": "Password is required" }),
    confirmPhrase: joi.string().valid("Dont Delete Me :(").required().messages({
        "any.only":     "Confirmation phrase does not match",
        "any.required": "Confirmation phrase is required",
    }),
}).options({ stripUnknown: true })
