import type { ResponseQueryParameters } from "../http/get-query-parameters.js";
import { applyResponseOptions } from "../http/apply-query-parameters.js";
import { ParserKind } from "../parsers/type-parser-kind.js";
import { TParseResult } from "../domain/type-parse-result.js";
import { ICacheRepository } from "../repositories/redis-cache-repository.js";
import { ISnapshotRepository } from "../repositories/mongo-snapshot-repository.js";
import { logger } from "../logger.js";


type ParseServiceDeps = {
    cache: ICacheRepository;
    snapshot: ISnapshotRepository;
    parse: (kind: ParserKind, url: string) => Promise<TParseResult>;
};

export class ParseService {
    constructor(private deps: ParseServiceDeps) {}

    async getOrParse(kind: ParserKind, url: string, opts: ResponseQueryParameters): Promise<TParseResult> {
        const cached = await this.deps.cache.get(kind, url);
        if (cached) {
            return applyResponseOptions(cached, opts);
        }

        const snap = await this.deps.snapshot.get(kind, url);
        if (snap) {
            void this.refreshInBackground(kind, url);
            return applyResponseOptions(snap.data, opts);
        }

        const parsed = await this.deps.parse(kind, url);
        await this.deps.snapshot.set(kind, url, parsed);
        await this.deps.cache.set(kind, url, parsed);
        return applyResponseOptions(parsed, opts);
    }

    private refreshInBackground(kind: ParserKind, url: string): Promise<void> {
        return this.deps.parse(kind, url)
            .then(async (parsed) => {
                await this.deps.snapshot.set(kind, url, parsed);
                await this.deps.cache.set(kind, url, parsed);
            })
            .catch((e) => logger.error({ err: String(e), kind, url }, 
                "{refreshInBackground} Ошибка при обновлении кеша в фоне!"));
    }
}