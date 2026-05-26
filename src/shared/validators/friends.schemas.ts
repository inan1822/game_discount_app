import joi from "joi"

// Mongo ObjectId — 24 lowercase hex chars
const objectId = joi.string().pattern(/^[a-f0-9]{24}$/).message("Invalid id")

export const friendIdParamSchema = joi.object({
    id: objectId.required(),
}).options({ stripUnknown: true })

export const requesterIdParamSchema = joi.object({
    requesterId: objectId.required(),
}).options({ stripUnknown: true })

export const userSearchQuerySchema = joi.object({
    q:     joi.string().trim().min(2).max(40).required(),
    limit: joi.number().integer().min(1).max(50).default(20),
}).options({ stripUnknown: true })
