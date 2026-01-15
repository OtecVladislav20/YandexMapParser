import type { Request, RequestHandler, Response } from "express";
import { getQueryParameters, type ResponseQueryParameters } from "../http/get-query-parameters.js";
import type { TParseResult } from "../domain/type-parse-result.js";
import type { ParseService } from "../services/parse-service.js";
import type { ParserKind } from "../types/type-parser-kind.js";


type ParseRequestBody = { url?: string };

type ApiResponse =
    | { success: true; data: TParseResult; error: null }
    | { success: false; data: null; error: string };

export class ParseController {
    constructor(private parseService: ParseService) {}

    handle(kind: ParserKind): RequestHandler<{}, ApiResponse, ParseRequestBody> {
        return (req: Request<{}, ApiResponse, ParseRequestBody>, res: Response<ApiResponse>) => {
            void this.handleParse(req, res, kind);
        };
    }

    private async handleParse(
        req: Request<{}, ApiResponse, ParseRequestBody>,
        res: Response<ApiResponse>,
        kind: ParserKind
    ) {
        const url = req.body?.url;

        req.log.info({ kind, url }, "Запрос получен");
        const started = Date.now();

        if (!url || typeof url !== "string") {
            return res.status(400).json({ success: false, data: null, error: "Некорректный url" });
        }

        const parsed = getQueryParameters(req.query);
        if (!parsed.ok) {
            return res.status(400).json({ success: false, data: null, error: parsed.error });
        }
        const opts: ResponseQueryParameters = parsed.value;

        try {
            const result = await this.parseService.getOrParse(kind, url, opts);
            req.log.info({ kind, ms: Date.now() - started }, "Запрос обработан");
            return res.json({ success: true, data: result, error: null });
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            req.log.warn({ kind, err: msg, ms: Date.now() - started }, "Ошибка при обработке запроса");
            return res
                .status(msg === "queue_full" ? 429 : 500)
                .json({ success: false, data: null, error: msg });
        }
    }
}
