import { TParseResult } from "../domain/type-parse-result.js";
import { ParserKind } from "../types/type-parser-kind.js";


export interface ICacheRepository {
    get(kind: ParserKind, url: string): Promise<TParseResult | null>;
    set(kind: ParserKind, url: string, value: TParseResult): Promise<void>;
}
