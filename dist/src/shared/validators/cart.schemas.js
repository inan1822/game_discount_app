import joi from "joi";
const mongoId = joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
    "string.pattern.base": "ID must be a valid MongoDB ObjectId",
    "any.required": "ID is required"
});
// ── Body Schemas ────────────────────────────────────────────
export const addToCartSchema = joi.object({
    productId: mongoId,
    quantity: joi.number().integer().min(1).default(1)
}).options({ stripUnknown: true });
export const updateCartItemSchema = joi.object({
    quantity: joi.number().integer().min(1).required().messages({
        "any.required": "Quantity is required",
        "number.min": "Quantity must be at least 1"
    })
}).options({ stripUnknown: true });
export const syncCartSchema = joi.object({
    items: joi.array().items(joi.object({
        productId: mongoId,
        quantity: joi.number().integer().min(1).required()
    })).min(1).required().messages({
        "array.min": "No items to sync",
        "any.required": "Items are required"
    })
}).options({ stripUnknown: true });
// ── Params Schemas ──────────────────────────────────────────
export const productIdParamsSchema = joi.object({
    productId: mongoId
}).options({ stripUnknown: true });
//# sourceMappingURL=cart.schemas.js.map