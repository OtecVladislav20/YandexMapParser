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

function isoDateUTC(d: Date) {
    return d.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
}


function parseRuDate(value: string): Date | null {
    const date = value.trim().toLowerCase().match(/^(\d{1,2})\s+([а-яё]+)\s+(\d{4})$/i);
    if (!date) return null;
    const day = Number(date[1]);
    const month = RU_MONTHS[date[2]];
    const year = Number(date[3]);
    if (!Number.isFinite(day) || !Number.isFinite(year) || month === undefined) return null;
    return new Date(Date.UTC(year, month, day));
}

function parseEnDate(raw: string, now: Date): Date | null {
    const s = raw.trim();
    if (!s) return null;

    if (/\d{4}/.test(s)) {
        const d = new Date(s);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    const y = now.getUTCFullYear();
    const guess = new Date(`${s}, ${y}`);
    if (Number.isNaN(guess.getTime())) return null;

    const tomorrow = addDays(now, 1).getTime();
    if (guess.getTime() > tomorrow) {
        const prev = new Date(`${s}, ${y - 1}`);
        return Number.isNaN(prev.getTime()) ? null : prev;
    }
    return guess;
}

export function parseReviewDate(raw: string | null | undefined, now = new Date()): string | null {
    if (!raw) return null;
    const s = raw.trim();
    if (!s) return null;

    const ru = parseRuDate(s);
    if (ru) return isoDateUTC(ru);

    const en = parseEnDate(s, now);
    if (en) return isoDateUTC(en);

    return null;
}


export function normalizeYandexDate(raw: string | null | undefined, now = new Date()) {
    return parseReviewDate(raw, now);
}

export function normalize2gisDate(raw: string | null | undefined, now = new Date()) {
    if (!raw) return null;
    const s = raw.split(",")[0].trim().toLowerCase();
    if (s === "сегодня") return isoDateUTC(now);
    if (s === "вчера") return isoDateUTC(addDays(now, -1));
    return parseReviewDate(s, now);
}

export function normalizeDoctorsDate(raw: string | null | undefined, now = new Date()) {
    if (!raw) return null;
    const s = raw.split(" в ")[0].trim();
    return parseReviewDate(s, now);
}
