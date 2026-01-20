declare module "swagger-ui-express" {
    import type { RequestHandler } from "express";
    
    export const serve: RequestHandler[];
    export function setup(swaggerDoc?: any, ...args: any[]): RequestHandler;
    const swaggerUi: { serve: RequestHandler[]; setup: typeof setup };
    export default swaggerUi;
}
