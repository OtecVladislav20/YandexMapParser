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
import { RedisCacheRepository } from "./repositories/redis-cache-repository.js";
import { ParseService } from "./services/parse-service.js";
import { ParseController } from "./controllers/parse-controller.js";


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
    profilePool,
    baseLogger: logger.child({ module: "queue" }),
});
const handleRedis = new RedisCacheRepository(redis, Number(process.env.CACHE_TTL_SECONDS ?? "3600"));
const parseService = new ParseService({
    cache: handleRedis,
    parse: (kind, url) => enqueue(pqueue, kind, url),
});
const parseController = new ParseController(parseService);

app.get("/", (_req, res) => res.json({ message: "Parser API запущен!" }));

app.get("/health", (_req, res) => {
    res.json({ status: "ok", workers: PARSER_WORKERS, queue: queueStats(pqueue) });
});

const openapiPath = new URL("../openapi.yml", import.meta.url);
const openapiDoc = parseYaml(readFileSync(openapiPath, "utf8"));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDoc));

app.post("/parse/yandex", parseController.handle("yandex"));
app.post("/parse/2gis", parseController.handle("2gis"));
app.post("/parse/doctors", parseController.handle("doctors"));

app.listen(PORT, () => console.log(`API listening on :${PORT}`));

