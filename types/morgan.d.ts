declare module "morgan" {
    import { RequestHandler } from "express";

    interface MorganOptions {
        immediate?: boolean;
        skip?: (req: any, res: any) => boolean;
        stream?: {
            write: (message: string) => void;
        };
    }

    type FormatFn = (tokens: any, req: any, res: any) => string;

    function morgan(
        format: string | FormatFn,
        options?: MorganOptions
    ): RequestHandler;

    export = morgan;
}