import express from "express";
import PQueue from "p-queue";
import { createRedis } from "./redis.js";
import { ProfilePool } from "./profilePool.js";
import { createQueue } from "./queue.js";
import { logger } from "./logger.js";
import pinoHttp from "pino-http";
import crypto from "node:crypto";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";
import fs from "fs";


const PORT = Number(process.env.PORT ?? "8000");
const PARSER_WORKERS = Number(process.env.PARSER_WORKERS ?? "5");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(
    pinoHttp({
        logger,
        genReqId: (req) => req.headers["x-request-id"] ?? crypto.randomUUID(),
        customProps: (req) => ({ route: req.url }),
        customSuccessMessage: () => "Запрос выдан",
    })
);

const pqueue = new PQueue({ concurrency: PARSER_WORKERS });
const profilePool = new ProfilePool(PARSER_WORKERS);

const redis = await createRedis();
const { enqueue, queueStats } = createQueue({ redis, profilePool, baseLogger: logger.child({ module: "queue" }) });

app.get("/", (req, res) => res.json({ message: "Parser API запущен!" }));

app.get("/health", (req, res) => {
    res.json({ status: "ok", workers: PARSER_WORKERS, queue: queueStats(pqueue) });
});

const openapiPath = new URL("../openapi.yml", import.meta.url);
const openapiDoc = YAML.parse(fs.readFileSync(openapiPath, "utf8"));

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDoc));

async function handleParse(req, res, kind) {
    const url = req.body?.url;

    req.log.info({ kind, url }, "Запрос получен");
    const started = Date.now();

    if (!url || typeof url !== "string") {
        return res.status(400).json({ success: false, data: null, error: "Некорректный url" });
    }

    try {
        const data = await enqueue(pqueue, kind, url, req.log);
        req.log.info({ kind, ms: Date.now() - started }, "Запрос обрабатывается");
        return res.json({ success: true, data, error: null });
    } catch (e) {
        const msg = e?.message ?? String(e);
        req.log.warn({ kind, err: msg, ms: Date.now() - started }, "Поймана ошибка при обработке запроса");
        return res.status(msg === "queue_full" ? 429 : 500).json({ success: false, data: null, error: msg });
    }
}

app.post("/parse/yandex", (req, res) => handleParse(req, res, "yandex"));
app.post("/parse/2gis", (req, res) => handleParse(req, res, "2gis"));

app.listen(PORT, () => console.log(`API listening on :${PORT}`));
