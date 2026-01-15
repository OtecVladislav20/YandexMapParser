import type PQueue from "p-queue";
import type { Logger } from "pino";
import { cacheKey } from "./utils/generate-cache-key.js";
import { ProfilePool } from "./profilePool.js";
import { parseYandex } from "./parsers/yandex/parser-yandex.js";
import { parse2gis } from "./parsers/2gis/parser-gis.js";
import { ParserKind } from "./types/type-parser-kind.js";
import { parseAboutDoctors } from "./parsers/about-doctors/parser-about-doctors.js";
import { TParseResult } from "./domain/type-parse-result.js";


type QueueDeps = {
    profilePool: ProfilePool;
    baseLogger: Logger;
};

export function createQueue({ profilePool, baseLogger}: QueueDeps) {
    const logger = baseLogger;

    const PARSER_QUEUE_MAX = Number(process.env.PARSER_QUEUE_MAX ?? "200");
    if (!Number.isFinite(PARSER_QUEUE_MAX) || PARSER_QUEUE_MAX <= 0) {
        logger.fatal("Максимальный размер очерели задан неправильно!");
        throw new Error("PARSER_QUEUE_MAX must be a positive number");
    }

    const inFlight = new Map<string, Promise<TParseResult>>();

    function queueStats(pqueue: PQueue) {
        return {
            pending: pqueue.pending,
            size: pqueue.size
        };
    }

    async function runJob(kind: ParserKind, url: string, profileId: string): Promise<TParseResult> {
        if (kind === "yandex") return await parseYandex(url, profileId);
        if (kind === "2gis") return await parse2gis(url, profileId);
        return await parseAboutDoctors(url, profileId);
    }

    async function enqueue(pqueue: PQueue, kind: ParserKind, url: string): Promise<TParseResult> {
        const key = cacheKey(kind, url);

        const existing = inFlight.get(key);
        if (existing) return existing;

        if (pqueue.pending + pqueue.size >= PARSER_QUEUE_MAX) {
            logger.fatal({ key, kind }, 'Превышен максимальный размер очереди парсеров');
            throw new Error("queue_full");
        }

        const promise = pqueue.add(async () => {
            const profileId = await profilePool.acquire();
            logger.info({ profileId }, `Начинаем парсинг с профилем воркера: ${profileId}`);
            try {
                return await runJob(kind, url, profileId);
            } finally {
                profilePool.release(profileId);
                logger.info({ profileId }, `Профиль воркера ${profileId} освобожден`);
            }
        });

        inFlight.set(key, promise);
        logger.info({ key, kind, inflight_size: inFlight.size }, "Запрос в очереди выполнения");

        try {
            return await promise;
        } finally {
            if (inFlight.get(key) === promise) {
                inFlight.delete(key);
                logger.info({ key, kind, inflight_size: inFlight.size }, "Запрос удален из очереди выполнения");
            }
        }
    }

    return { enqueue, queueStats };
}
