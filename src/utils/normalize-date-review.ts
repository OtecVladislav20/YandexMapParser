// Яндекс - "date": "October 17, 2025"
// 2гис - "date": "29 декабря 2025"
// ПроДокторов - "date": "22 декабря 2025 в 12:06"

const RU_MONTHS: Record<string, number> = {
    января: 0,
    февраля: 1,
    марта: 2,
    апреля: 3,
    мая: 4,
    июня: 5,
    июля: 6,
    августа: 7,
    сентября: 8,
    октября: 9,
    ноября: 10,
    декабря: 11,
};

function isoDateUTC(date: Date) {
    return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
}


function parseRuDate(value: string, now: Date): Date | null {
    const date = value
        .trim()
        .toLowerCase()
        .match(/^(\d{1,2})\s+([а-яё]+)(?:\s+(\d{4}))?$/i);

    if (!date) return null;

    const day = Number(date[1]);
    const month = RU_MONTHS[date[2]];

    const isYearMissing = !date[3];
    let year = isYearMissing ? now.getUTCFullYear() : Number(date[3]);
    if (!Number.isFinite(year)) return null;

    let isoDate = new Date(Date.UTC(year, month, day));
    if (Number.isNaN(isoDate.getTime())) return null;

    if (isYearMissing) {
        const tomorrow = addDays(now, 1).getTime();
        if (isoDate.getTime() > tomorrow) {
            year = year - 1;
            isoDate = new Date(Date.UTC(year, month, day));
            if (Number.isNaN(isoDate.getTime())) return null;
        }
    }

    return isoDate;
}

function parseEnDate(value: string, now: Date): Date | null {
    const date = value.trim();
    if (!date) return null;

    if (/\d{4}/.test(date)) {
        const d = new Date(date);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    const yearCurrent = now.getUTCFullYear();
    const guessDate = new Date(`${date}, ${yearCurrent}`);
    if (Number.isNaN(guessDate.getTime())) return null;

    const tomorrow = addDays(now, 1).getTime();
    if (guessDate.getTime() > tomorrow) {
        const prev = new Date(`${date}, ${yearCurrent - 1}`);
        return Number.isNaN(prev.getTime()) ? null : prev;
    }
    return guessDate;
}

export function parseReviewDate(value: string | null | undefined, now = new Date()): string | null {
    if (!value) return null;
    const trimmed  = value.trim();
    if (!trimmed ) return null;

    const ru = parseRuDate(trimmed , now);
    if (ru) return isoDateUTC(ru);

    const en = parseEnDate(trimmed , now);
    if (en) return isoDateUTC(en);

    return null;
}


export function normalizeYandexDate(raw: string | null | undefined, now = new Date()) {
    return parseReviewDate(raw, now);
}

export function normalize2gisDate(raw: string | null | undefined, now = new Date()) {
    if (!raw) return null;
    const singleWord = raw.split(",")[0].trim().toLowerCase();
    if (singleWord === "сегодня") return isoDateUTC(now);
    if (singleWord === "вчера") return isoDateUTC(addDays(now, -1));
    return parseReviewDate(singleWord, now);
}

export function normalizeDoctorsDate(raw: string | null | undefined, now = new Date()) {
    if (!raw) return null;
    const parsedDate = raw.split(" в ")[0].trim();
    return parseReviewDate(parsedDate, now);
}
