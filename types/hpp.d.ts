declare module "hpp" {
    import { RequestHandler } from "express";

    interface HppOptions {
        whitelist?: string | string[];
        checkQuery?: boolean;
        checkBody?: boolean;
        checkBodyOnlyForContentType?: string[];
    }

    function hpp(options?: HppOptions): RequestHandler;

    export = hpp;
}