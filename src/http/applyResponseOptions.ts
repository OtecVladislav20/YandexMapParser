import { ResponseQueryParameters } from "./parseQuery.js";



type AnyObj = Record<string, unknown>;

function toNumberOrNull(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function getReviewRating(review: unknown): number | null {
  if (!review || typeof review !== "object") return null;
  const r = (review as AnyObj)["rating"] ?? (review as AnyObj)["raiting"];
  return toNumberOrNull(r);
}

export function applyResponseOptions<T extends { reviews?: unknown[] }>(
  data: T,
  opts: ResponseQueryParameters
): T {
  if (!data || typeof data !== "object") return data;

  const base = data as any;
  if (!Array.isArray(base.reviews)) return data;

  let reviews: unknown[] = base.reviews;

  // фильтры (можешь расширять тут)
  const minRating = toNumberOrNull((opts as any).minRating ?? (opts as any).rating);
  if (minRating !== null) {
    reviews = reviews.filter((r) => {
      const rr = getReviewRating(r);
      return rr !== null && rr >= minRating;
    });
  }

  // лимит на выдачу
  const count = toNumberOrNull((opts as any).count);
  if (count !== null) {
    const n = Math.max(0, Math.floor(count));
    reviews = reviews.slice(0, n);
  }

  // важно: возвращаем копию, кеш не трогаем
  return { ...base, reviews } as T;
}
