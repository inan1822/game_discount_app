import joi from "joi";
// ── Body Schemas ────────────────────────────────────────────
export const createProductSchema = joi.object({
    Title: joi.string().required(),
    Price: joi.number().min(0).required(),
    description: joi.string().required(),
    category: joi.string().valid("electronics", "clothing", "food").required(),
    stock: joi.number().integer().min(0).required()
}).options({ stripUnknown: true });
export const updateProductSchema = joi.object({
    Title: joi.string(),
    Price: joi.number().min(0),
    description: joi.string(),
    category: joi.string().valid("electronics", "clothing", "food"),
    stock: joi.number().integer().min(0),
    isActive: joi.boolean()
}).min(1).options({ stripUnknown: true })
    .messages({ "object.min": "At least one field must be provided" });
export const addRatingSchema = joi.object({
    rating: joi.number().integer().min(1).max(5).required(),
    comment: joi.string().required()
}).options({ stripUnknown: true });
// ── Params Schemas ──────────────────────────────────────────
const mongoId = joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
    "string.pattern.base": "ID must be a valid MongoDB ObjectId",
    "any.required": "ID is required"
});
export const productIdParamsSchema = joi.object({
    id: mongoId
}).options({ stripUnknown: true });
export const userIdParamsSchema = joi.object({
    id: mongoId
}).options({ stripUnknown: true });
export const getAllProductsQuerySchema = joi.object({
    page: joi.number().integer().min(1).default(1),
    limit: joi.number().integer().min(1).max(100).default(10),
    category: joi.string().valid("electronics", "clothing", "food"),
    minPrice: joi.number().min(0),
    maxPrice: joi.number().min(0),
    sort: joi.string().valid("Price", "createdAt", "averageRating", "sold").default("createdAt"),
    order: joi.string().valid("asc", "desc").default("desc"),
    search: joi.string().max(100)
}).options({ stripUnknown: true });
//# sourceMappingURL=products.schemas.js.map