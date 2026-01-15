import type { ResponseQueryParameters } from "../http/get-query-parameters.js";
import { applyResponseOptions } from "../http/apply-query-parameters.js";
import { ParserKind } from "../types/type-parser-kind.js";
import { TParseResult } from "../domain/type-parse-result.js";
import { RedisCacheRepository } from "../repositories/redis-cache-repository.js";


type ParseServiceDeps = {
    cache: RedisCacheRepository;
    parse: (kind: ParserKind, url: string) => Promise<TParseResult>;
};

export class ParseService {
    constructor(private deps: ParseServiceDeps) {}

    async getOrParse(kind: ParserKind, url: string, opts: ResponseQueryParameters): Promise<TParseResult> {
        const cached = await this.deps.cache.get(kind, url);
        if (cached) return applyResponseOptions(cached, opts);
        
        const parsed = await this.deps.parse(kind, url);
        await this.deps.cache.set(kind, url, parsed);
        
        return applyResponseOptions(parsed, opts);
    }
}