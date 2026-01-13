import express, { type Request, type Response } from "express";
import PQueue from "p-queue";
import { pinoHttp } from "pino-http";
import crypto from "node:crypto";
import { parse as parseYaml } from "yaml";
import { readFileSync } from "node:fs";
import swaggerUi from "swagger-ui-express";

import { ProfilePool } from "./profilePool.js";
import { createRedis } from "./redis.js";
import { createQueue } from "./queue.js";
import { logger } from "./logger.js";
import { ParserKind } from "./types/type-parser-kind.js";
import { getQueryParameters, ResponseQueryParameters } from "./http/get-query-parameters.js";
import { applyResponseOptions } from "./http/apply-query-parameters.js";


type ParseRequestBody = { url?: string };

const PORT = Number(process.env.PORT ?? "8000");
const PARSER_WORKERS = Number(process.env.PARSER_WORKERS ?? "5");

const app = express();
app.use(express.json({ limit: "1mb" }));

app.use(
    pinoHttp({
        logger,
        genReqId: (req) => (req.headers["x-request-id"] as string | undefined) ?? crypto.randomUUID(),
        customProps: (req) => ({ route: req.url }),
        customSuccessMessage: () => "Запрос выдан",
    })
);

const pqueue = new PQueue({ concurrency: PARSER_WORKERS });
const profilePool = new ProfilePool(PARSER_WORKERS);

const redis = await createRedis();
const { enqueue, queueStats } = createQueue({
    redis,
    profilePool,
    baseLogger: logger.child({ module: "queue" }),
});

app.get("/", (_req, res) => res.json({ message: "Parser API запущен!" }));

app.get("/health", (_req, res) => {
    res.json({ status: "ok", workers: PARSER_WORKERS, queue: queueStats(pqueue) });
});

const openapiPath = new URL("../openapi.yml", import.meta.url);
const openapiDoc = parseYaml(readFileSync(openapiPath, "utf8"));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDoc));

async function handleParse(
    req: Request<{}, any, ParseRequestBody>,
    res: Response,
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
        const data = await enqueue(pqueue, kind, url);
        const out = applyResponseOptions(data, opts);
        req.log.info({ kind, ms: Date.now() - started }, "Запрос обработан");
        return res.json({ success: true, data: out, error: null });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        req.log.warn({ kind, err: msg, ms: Date.now() - started }, "Ошибка при обработке запроса");
        return res.status(msg === "queue_full" ? 429 : 500).json({ success: false, data: null, error: msg });
    }
}

app.post("/parse/yandex", (req: Request<{}, any, ParseRequestBody>, res) => {
    void handleParse(req, res, "yandex");
});

app.post("/parse/2gis", (req: Request<{}, any, ParseRequestBody>, res) => {
    void handleParse(req, res, "2gis");
});

app.post("/parse/doctors", (req: Request<{}, any, ParseRequestBody>, res) => {
    void handleParse(req, res, "doctors");
});

app.listen(PORT, () => console.log(`API listening on :${PORT}`));

