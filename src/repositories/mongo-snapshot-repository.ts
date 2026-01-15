import { Collection, Db } from "mongodb";
import { TParseResult } from "../domain/type-parse-result.js";
import { ParserKind } from "../parsers/type-parser-kind.js";
import { cacheKey } from "../utils/generate-cache-key.js";
import { logger } from "../logger.js";


type Snapshot = {
    _id: string;
    updatedAt: Date;
    kind: ParserKind;
    url: string;
    data: TParseResult;
};

export interface ISnapshotRepository {
    get(kind: ParserKind, url: string): Promise<Snapshot | null>;
    set(kind: ParserKind, url: string, data: TParseResult): Promise<void>;
}

export class SnapshotRepository implements ISnapshotRepository {
    private collection: Collection<Snapshot>;

    constructor(db: Db, collectionName = "parse_snapshots") {
        this.collection = db.collection<Snapshot>(collectionName);
    }

    async get(kind: ParserKind, url: string): Promise<Snapshot | null> {
        const _id = cacheKey(kind, url);
        return await this.collection.findOne({ _id });
    }

    async set(kind: ParserKind, url: string, data: TParseResult): Promise<void> {
        const _id = cacheKey(kind, url);
        await this.collection.updateOne(
            { _id },
            { $set: { kind, url, data, updatedAt: new Date() } },
            { upsert: true }
        );
        logger.info({ key: _id }, "Снимок сохранен в MongoDB");
    }
}