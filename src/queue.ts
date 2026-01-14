import type PQueue from "p-queue";
import type { Logger } from "pino";
import type { RedisClientType, RedisModules, RedisFunctions, RedisScripts } from "redis";
import { cacheKey } from "./cache.js";
import { ProfilePool } from "./profilePool.js";
import { parseYandex } from "./parsers/yandex/parser-yandex.js";
import { parse2gis } from "./parsers/gis.js";
import { ParserKind } from "./types/type-parser-kind.js";
import { parseAboutDoctors } from "./parsers/about-doctors.js";
import { TReview } from "./types/type-review.js";


type ParseResult = {
    name: string | null;
    rating: string | null;
    count_reviews: string | null;
    reviews: TReview[];
};

type QueueDeps = {
    redis?: RedisClientType<RedisModules, RedisFunctions, RedisScripts>;
    profilePool: ProfilePool;
    baseLogger: Logger;
};

export function createQueue({ redis, profilePool, baseLogger}: QueueDeps) {
    const logger = baseLogger;
    const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS);
    const PARSER_QUEUE_MAX = Number(process.env.PARSER_QUEUE_MAX);

    const inFlight = new Map();

    function queueStats(pqueue: PQueue) {
        return {
            pending: pqueue.pending,
            size: pqueue.size
        };
    }

    async function runJob(kind: ParserKind, url: string, profileId: string): Promise<ParseResult> {
        if (kind === "yandex") return await parseYandex(url, profileId);
        if (kind === "2gis") return await parse2gis(url, profileId);
        return await parseAboutDoctors(url, profileId);
    }

    async function enqueue(pqueue: PQueue, kind: ParserKind, url: string): Promise<ParseResult> {
        const key = cacheKey(kind, url);
        logger.info({ key, kind }, "Получен ключ для кеширования");

        if (redis) {
            const cached = await redis.get(key);
            if (cached) {
                logger.info({ key, kind }, "Ключ найден в кеше");
                return JSON.parse(cached);
            }
        }

        const existing = inFlight.get(key);
        if (existing) {
            logger.info({ key, kind }, "Такой запрос уже в процессе выполнения, ждем его завершения");
            return await existing;
        }

        if (pqueue.pending + pqueue.size >= PARSER_QUEUE_MAX) {
            logger.fatal({ key, kind }, 'Превышен максимальный размер очереди парсеров');
            throw new Error("queue_full");
        }

        const promise: Promise<ParseResult> = pqueue.add(async () => {
            const profileId = await profilePool.acquire();
            logger.info({ profileId }, `Начинаем парсинг с профилем воркера: ${profileId}`);
            try {
                const data = await runJob(kind, url, profileId);
                if (redis) {
                    await redis.set(key, JSON.stringify(data), { EX: CACHE_TTL_SECONDS });
                    logger.info({ data }, "Данные сохранены в кеше");
                }
                return data;
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
