import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="not-found-page">
      <p className="editorial-kicker">404</p>
      <h1>Страница не найдена</h1>
      <p>Запрошенный маршрут отсутствует в текущей структуре портфолио.</p>
      <Link href="/" className="button-primary">
        На главную
      </Link>
    </main>
  );
}
