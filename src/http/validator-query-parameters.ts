import { logger } from "../logger.js";


export function parseIntInRange(raw: string, min: number, max: number, name: string): number {
    let value = Number.parseInt(raw, 10);

    if (!Number.isFinite(value) || !Number.isInteger(value)) {
        logger.error(`${name} должен быть целым числом`);
        throw new Error(`${name} должен быть целым числом`);
    }

    if (value < min) value = min;
    if (value > max) value = max;

    return value;
}

export function parseDate(raw: string, name: string): string {
    const date = raw.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        logger.error(`${name} должен быть в формате YYYY-MM-DD`);
        throw new Error(`${name} должен быть в формате YYYY-MM-DD`);
    }

    const dateNormalize = new Date(date + "T00:00:00Z");
    if (Number.isNaN(dateNormalize.getTime())) {
        logger.error(`${name} некорректная дата`);
        throw new Error(`${name} некорректная дата`);
    }

    return dateNormalize.toISOString().slice(0, 10);
}
