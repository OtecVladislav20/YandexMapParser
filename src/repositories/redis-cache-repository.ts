import type { RedisClientType, RedisModules, RedisFunctions, RedisScripts } from "redis";
import { cacheKey } from "../utils/generate-cache-key.js";
import type { ParserKind } from "../types/type-parser-kind.js";
import type { TParseResult } from "../domain/type-parse-result.js";
import { ICacheRepository } from "./interface-cache-repository.js";


type Redis = RedisClientType<RedisModules, RedisFunctions, RedisScripts>;

export class RedisCacheRepository implements ICacheRepository {
    constructor(private redis: Redis, private ttlSeconds: number | undefined) {}

    async get(kind: ParserKind, url: string): Promise<TParseResult | null> {
        const key = cacheKey(kind, url);
        const raw = await this.redis.get(key);
        if (!raw) return null;
        return JSON.parse(raw) as TParseResult;
    }

    async set(kind: ParserKind, url: string, value: TParseResult): Promise<void> {
        const key = cacheKey(kind, url);
        const payload = JSON.stringify(value);
        
        if (this.ttlSeconds && Number.isFinite(this.ttlSeconds) && this.ttlSeconds > 0) {
            await this.redis.set(key, payload, { EX: this.ttlSeconds });
        } else {
            await this.redis.set(key, payload);
        }
    }
}
