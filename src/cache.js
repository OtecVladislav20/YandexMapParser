import crypto from "crypto";


export function extractOrgId(kind, url) {
    if (kind === "2gis") {
        const m = url.match(/\/firm\/(\d+)/);
        return m?.[1] ?? null;
    }
    if (kind === "yandex") {
        let m = url.match(/\/org\/[^/]+\/(\d+)/);
        if (m?.[1]) return m[1];
        m = url.match(/oid=(\d+)/);
        return m?.[1] ?? null;
    }
    return null;
}

export function cacheKey(kind, url) {
    const orgId = extractOrgId(kind, url);
    if (orgId) return `cache:${kind}:org:${orgId}`;
    const sha1 = crypto.createHash("sha1").update(url, "utf8").digest("hex");
    return `cache:${kind}:url:${sha1}`;
}
