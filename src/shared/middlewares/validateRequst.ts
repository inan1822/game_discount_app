import { Response, Request, NextFunction } from "express"
import { ObjectSchema } from "joi"

type property = "body" | "params" | "query"

export function validateRequest(schema: ObjectSchema, property: property) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
        try {
            const value = req[property] // body, params, query
            const validated = await schema.validateAsync //confirm that the data is correct
                (value, {
                    abortEarly: false, // show all errors at once
                    stripUnknown: true // remove unknown fields
                })
            if (property === "body") {
                req[property] = validated
            }
            next()
        } catch (error) {
            const err = error as { isJoi: boolean, details: Array<{ path: string[], message: string }>, message?: string }
            // Joi validation error — has error.details
            if (err.isJoi && err.details) {
                return res.status(400).json({
                    status: "400",
                    message: "Validation error",
                    data: err.details.map(detail => ({
                        field: detail.path.join("."),
                        message: detail.message
                    }))
                })
            }


            return res.status(500).json({
                status: "500",
                message: "Unexpected validation error",
                data: err.message
            })
        }
    }
}
