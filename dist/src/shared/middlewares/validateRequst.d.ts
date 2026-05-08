import { Response, Request, NextFunction } from "express";
import { ObjectSchema } from "joi";
type property = "body" | "params" | "query";
export declare function validateRequest(schema: ObjectSchema, property: property): (req: Request, res: Response, next: NextFunction) => Promise<void | Response>;
export {};
//# sourceMappingURL=validateRequst.d.ts.map