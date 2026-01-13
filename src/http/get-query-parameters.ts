import { logger } from "../logger.js";
import { QueryParam } from "./query-parameters.js";
import { parseDate, parseIntInRange } from "./validator-query-parameters.js";


export type ResponseQueryParameters = {
    [QueryParam.Count]?: number;
    [QueryParam.MinRating]?: number;
    [QueryParam.MaxRating]?: number;
    [QueryParam.DateStart]?: string;
    [QueryParam.DateEnd]?: string;
};

type Ok = { ok: true; value: ResponseQueryParameters };
type Err = { ok: false; error: string };

export function getQueryParameters(query: unknown): Ok | Err {
    try {
        const count = getCount(query);
        const { minRating, maxRating } = getRating(query);
        const { dateStart, dateEnd } = getDate(query);
        return { ok: true, value: { count, minRating, maxRating, dateStart, dateEnd } };
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

function getCount(query: unknown) {
    const countStr = getValue(query, QueryParam.Count);
    const count = countStr === undefined ? undefined : parseIntInRange(countStr, 0, 150, QueryParam.Count);
    return count;
}

function getRating(query: unknown) {
    const minRatingStr = getValue(query, QueryParam.MinRating);
    let minRating =
      minRatingStr === undefined ? undefined : parseIntInRange(minRatingStr, 1, 5, QueryParam.MinRating);

    const maxRatingStr = getValue(query, QueryParam.MaxRating);
    let maxRating =
      maxRatingStr === undefined ? undefined : parseIntInRange(maxRatingStr, 1, 5, QueryParam.MaxRating);

    if (minRating !== undefined && maxRating !== undefined && minRating > maxRating) {
        [minRating, maxRating] = [maxRating, minRating];
        logger.warn("minRating был больше maxRating, значения поменяны местами");
    }

    return { minRating, maxRating };
}

function getDate(query: unknown) {
    const dateStartStr = getValue(query, QueryParam.DateStart);
    let dateStart = dateStartStr === undefined ? undefined : parseDate(dateStartStr, QueryParam.DateStart);

    const dateEndStr = getValue(query, QueryParam.DateEnd);
    let dateEnd = dateEndStr === undefined ? undefined : parseDate(dateEndStr, QueryParam.DateEnd);
    if (dateStart !== undefined && dateEnd !== undefined && dateStart > dateEnd) {
        [dateStart, dateEnd] = [dateEnd, dateStart];
        logger.warn("dateStart был больше dateEnd, значения поменяны местами");
    }
    
    return { dateStart, dateEnd };
}
