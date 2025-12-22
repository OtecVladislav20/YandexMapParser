import express from "express";
import PQueue from "p-queue";
import { createRedis } from "./redis.js";
import { ProfilePool } from "./profilePool.js";
import { createQueue } from "./queue.js";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";
import fs from "fs";


const PORT = Number(process.env.PORT ?? "8000");
const PARSER_WORKERS = Number(process.env.PARSER_WORKERS ?? "5");

const app = express();
app.use(express.json({ limit: "1mb" }));

const openapiPath = new URL("../openapi.yml", import.meta.url);
const openapiDoc = YAML.parse(fs.readFileSync(openapiPath, "utf8"));

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDoc));


const pqueue = new PQueue({ concurrency: PARSER_WORKERS });
const profilePool = new ProfilePool(PARSER_WORKERS);

const redis = await createRedis();
const { enqueue, queueStats } = createQueue({ redis, profilePool });

app.get("/", (req, res) => res.json({ message: "Parser API running!" }));

app.get("/health", (req, res) => {
    res.json({ status: "ok", workers: PARSER_WORKERS, queue: queueStats(pqueue) });
});

async function handleParse(req, res, kind) {
    const url = req.body?.url;
    if (!url || typeof url !== "string") {
        return res.status(400).json({ success: false, data: null, error: "url_required" });
    }

    try {
        const data = await enqueue(pqueue, kind, url);
        return res.json({ success: true, data, error: null });
    } catch (e) {
        const msg = e?.message ?? String(e);
        const code = msg === "queue_full" ? 429 : 500;
        return res.status(code).json({ success: false, data: null, error: msg });
    }
}

app.post("/parse/yandex", (req, res) => handleParse(req, res, "yandex"));
app.post("/parse/2gis", (req, res) => handleParse(req, res, "2gis"));

app.listen(PORT, () => console.log(`API listening on :${PORT}`));
