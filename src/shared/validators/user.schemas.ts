import joi from "joi"


// ── Body Schemas ────────────────────────────────────────────
export const deleteMyUserSchema = joi.object({
    password: joi.string().min(8).required()
}).options({ stripUnknown: true })

export const updateUserSchema = joi.object({
    name: joi.string().min(2).max(40),
    email: joi.string().email(),
    currentPassword: joi.string().min(8).required(),
    newPassword: joi.string().min(8)
}).min(2).options({ stripUnknown: true })
    .messages({ "object.min": "At least currentPassword and one field to update must be provided" })

export const addAddressSchema = joi.object({
    street: joi.string().required(),
    city: joi.string().required(),
    country: joi.string().required(),
    zipCode: joi.string().required()
}).options({ stripUnknown: true })

export const addToCartSchema = joi.object({
    productId: joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
        "string.pattern.base": "productId must be a valid MongoDB ObjectId"
    }),
    quantity: joi.number().integer().min(1).default(1)
}).options({ stripUnknown: true })

// ── Params Schemas ──────────────────────────────────────────
const mongoId = joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
    "string.pattern.base": "ID must be a valid MongoDB ObjectId",
    "any.required": "ID is required"
})

export const userIdParamsSchema = joi.object({
    id: mongoId
}).options({ stripUnknown: true })

export const addressIdParamsSchema = joi.object({
    addressId: mongoId
}).options({ stripUnknown: true })

export const productIdParamsSchema = joi.object({
    productId: mongoId
}).options({ stripUnknown: true })