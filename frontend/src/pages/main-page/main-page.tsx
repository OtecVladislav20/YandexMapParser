import { useState } from "react";

type Review = {
  name: string | null;
  text: string | null;
  rating: number | null;
  avatar: string | null;
  date: string | null;
};

type ParseResult = {
  name: string | null;
  rating: string | null;
  count_reviews: string | null;
  reviews: Review[];
};

type ApiResponse = {
  success: boolean;
  data: ParseResult | null;
  error: string | null;
};

export default function MainPage(): JSX.Element {
  const [url, setUrl] = useState("https://yandex.ru/maps/org/1014186377/reviews");
  const [data, setData] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleParse = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

      const resp = await fetch(`${apiBase}/parse/yandex?count=150`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const json = (await resp.json()) as ApiResponse;

      if (!resp.ok || !json.success) {
        throw new Error(json.error ?? `HTTP ${resp.status}`);
      }

      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 12 }}>Тест запроса к API</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Вставь ссылку на отзывы"
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={handleParse} disabled={loading || !url.trim()} style={{ padding: "8px 12px" }}>
          {loading ? "Парсим…" : "Парсить"}
        </button>
      </div>

      {error && <div style={{ color: "tomato" }}>Ошибка: {error}</div>}

      {data && (
        <>
          <div>Организация: {data.name}</div>
          <div>Рейтинг: {data.rating ?? "null"}</div>
          <div>Кол-во отзывов: {data.count_reviews ?? "null"}</div>

          <pre style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}
