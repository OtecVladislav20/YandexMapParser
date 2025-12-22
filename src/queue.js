import { cacheKey } from "./cache.js";
import { parseYandex } from "./parsers/yandex.js";
import { parse2gis } from "./parsers/gis.js";


export function createQueue({ redis, profilePool }) {
    const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS ?? String(3 * 24 * 3600));
    const PARSER_QUEUE_MAX = Number(process.env.PARSER_QUEUE_MAX ?? "200");

    const inFlight = new Map();

    function queueStats(pqueue) {
        return {
            pending: pqueue.pending,
            size: pqueue.size
        };
    }

    async function runJob(kind, url, profileId) {
        if (kind === "yandex") return await parseYandex(url, profileId);
        if (kind === "2gis") return await parse2gis(url, profileId);
    }

    async function enqueue(pqueue, kind, url) {
        const key = cacheKey(kind, url);
        
        if (redis) {
            const cached = await redis.get(key);
            if (cached) return JSON.parse(cached);
        }

        const existing = inFlight.get(key);
        if (existing) return await existing;

        if (pqueue.pending + pqueue.size >= PARSER_QUEUE_MAX) {
            throw new Error("queue_full");
        }

        const promise = pqueue.add(async () => {
            const profileId = await profilePool.acquire();
            try {
                const data = await runJob(kind, url, profileId);
                if (redis) await redis.set(key, JSON.stringify(data), { EX: CACHE_TTL_SECONDS });
                return data;
            } finally {
                profilePool.release(profileId);
            }
        });

        inFlight.set(key, promise);

        try {
            return await promise;
        } finally {
            if (inFlight.get(key) === promise) inFlight.delete(key);
        }
    }

    return { enqueue, queueStats };
}
