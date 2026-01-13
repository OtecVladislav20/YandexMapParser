import { logger } from "../logger.js";

export type ResponseQueryParameters = {
    count?: number;
    minRating?: number;
    maxRating?: number;
    dateTo?: string;
};

type Ok = { ok: true; value: ResponseQueryParameters };
type Err = { ok: false; error: string };

export function getQueryParameters(query: unknown): Ok | Err {
    try {
        const countStr = getValue(query, "count");
        const count = countStr === undefined ? undefined : parseIntInRange(countStr, 0, 150, "count");

        const minRatingStr = getValue(query, "minRating");
        let minRating =
          minRatingStr === undefined ? undefined : parseIntInRange(minRatingStr, 1, 5, "minRating");

        const maxRatingStr = getValue(query, "maxRating");
        let maxRating =
          maxRatingStr === undefined ? undefined : parseIntInRange(maxRatingStr, 1, 5, "maxRating");

        if (minRating !== undefined && maxRating !== undefined && minRating > maxRating) {
            [minRating, maxRating] = [maxRating, minRating];
            logger.warn("minRating был больше maxRating, значения поменяны местами");
        }
        
        return { ok: true, value: { count, minRating, maxRating } };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, error: msg };
    }
}

function getValue(query: unknown, key: string): string | undefined {
    if (!query || typeof query !== "object") return undefined;

    const value = (query as Record<string, unknown>)[key];

    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];

    return undefined;
}

function parseIntInRange(raw: string, min: number, max: number, name: string): number {
    let value = Number.parseInt(raw, 10);

    if (!Number.isFinite(value) || !Number.isInteger(value)) {
        logger.error(`${name} должен быть целым числом`);
        throw new Error(`${name} должен быть целым числом`);
    }

    if (value < min) value = min;
    if (value > max) value = max;

    return value;
}
