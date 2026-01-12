export type ResponseQueryParameters = {
    count?: number | undefined;
    rating?: string;
    dateTo?: string;
};

type Ok = { ok: true; value: ResponseQueryParameters };
type Err = { ok: false; error: string };

export function getQueryParameters(query: unknown): Ok | Err {
  try {
    const countStr = getString(query, "count");
    const count = countStr === undefined ? undefined : parseIntInRange(countStr, 0, 150, "count");

    return { ok: true, value: { count } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

function getString(query: unknown, key: string): string | undefined {
  if (!query || typeof query !== "object") return undefined;
  const v = (query as Record<string, unknown>)[key];

  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];

  return undefined;
}

function parseIntInRange(raw: string, min: number, max: number, name: string): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new Error(`${name} must be integer`);
  }
  if (n < min || n > max) {
    throw new Error(`${name} out of range (${min}..${max})`);
  }
  return n;
}
