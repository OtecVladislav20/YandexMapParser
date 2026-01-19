import { useState } from "react";
import "./main-page.scss";


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
  const [urlYandex, setUrlYandex] = useState("https://yandex.ru/maps/org/1014186377/reviews");
  const [urlGis, setUrlGis] = useState("https://2gis.ru/spb/firm/5348552839380704");
  const [urlDoctors, setUrlDoctors] = useState("https://prodoctorov.ru/novosibirsk/lpu/54669-duet-klinik/");
  const [data, setData] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reviews = data?.reviews ?? [];

  const handleParseYandex = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

      const resp = await fetch(`${apiBase}/parse/yandex?count=150`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlYandex })
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

  const handleParseGis = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

      const resp = await fetch(`${apiBase}/parse/2gis?count=150`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlGis })
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

  const handleParseDoctors = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

      const resp = await fetch(`${apiBase}/parse/doctors?count=150`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlDoctors })
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
      <div style={{ marginBottom: 12 }}>Тест запроса к парсингу Яндекса</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={urlYandex}
          onChange={(e) => setUrlYandex(e.target.value)}
          placeholder="Вставь ссылку на отзывы для Яндекса"
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={handleParseYandex} disabled={loading || !urlYandex.trim()} style={{ padding: "8px 12px" }}>
          {loading ? "Парсим…" : "Парсить"}
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>Тест запроса к парсингу 2гис</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={urlGis}
          onChange={(e) => setUrlGis(e.target.value)}
          placeholder="Вставь ссылку на отзывы для 2гис"
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={handleParseGis} disabled={loading || !urlGis.trim()} style={{ padding: "8px 12px" }}>
          {loading ? "Парсим…" : "Парсить"}
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>Тест запроса к парсингу ПроДокторов</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={urlDoctors}
          onChange={(e) => setUrlDoctors(e.target.value)}
          placeholder="Вставь ссылку на отзывы для ПроДокторов"
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={handleParseDoctors} disabled={loading || !urlDoctors.trim()} style={{ padding: "8px 12px" }}>
          {loading ? "Парсим…" : "Парсить"}
        </button>
      </div>

      {error && <div style={{ color: "tomato" }}>Ошибка: {error}</div>}

      <div className="block">
        <div>Название организации: {data?.name}</div>
        <div>Рейтинг организации: {data?.rating}</div>
        <div>Кол-во отзывов: {data?.count_reviews}</div>
      </div>
      <div>
        {reviews.map((review, index) => (
          <div key={index} className="block">
            {review.avatar && <div className="block__avatar"><img src={review.avatar} alt="Аватар" /></div>}
            <div>Имя: {review.name}</div>
            <div>Дата: {review.date}</div>
            <div>Рейтинг: {review.rating}</div>
            <div>Текст: {review.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
