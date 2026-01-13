declare module "body-parser" {
    import type { RequestHandler } from "express";
    
    export function json(options?: any): RequestHandler;
    export function urlencoded(options?: any): RequestHandler;
    export function raw(options?: any): RequestHandler;
    export function text(options?: any): RequestHandler;
}
