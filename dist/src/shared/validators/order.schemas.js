import joi from "joi";
const mongoId = joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
    "string.pattern.base": "ID must be a valid MongoDB ObjectId",
    "any.required": "ID is required"
});
// ── Body Schemas ────────────────────────────────────────────
export const createOrderSchema = joi.object({
    items: joi.array().items(joi.object({
        productId: mongoId,
        quantity: joi.number().integer().min(1).required()
    })).min(1).required().messages({
        "array.min": "Order must have at least one item"
    }),
    address: joi.object({
        street: joi.string().required(),
        city: joi.string().required(),
        country: joi.string().required(),
        zipCode: joi.string().required()
    }).required(),
    shippingCost: joi.number().min(0).default(0),
    paymentMethod: joi.string().valid("cash", "credit", "paypal").default("cash"),
    notes: joi.string().optional()
}).options({ stripUnknown: true });
export const updateOrderStatusSchema = joi.object({
    orderStatus: joi.string()
        .valid("processing", "shipped", "delivered", "cancelled")
        .required()
        .messages({
        "any.only": "Status must be processing / shipped / delivered / cancelled",
        "any.required": "orderStatus is required"
    })
}).options({ stripUnknown: true });
// ── Params Schemas ──────────────────────────────────────────
export const orderIdParamsSchema = joi.object({
    id: mongoId
}).options({ stripUnknown: true });
// ── Query Schemas ───────────────────────────────────────────
export const paginationQuerySchema = joi.object({
    page: joi.number().integer().min(1).default(1),
    limit: joi.number().integer().min(1).max(100).default(10)
}).options({ stripUnknown: true });
//# sourceMappingURL=order.schemas.js.map