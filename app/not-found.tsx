import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="not-found-page viewer-empty">
      <p className="eyebrow">404</p>
      <h2>Section not found</h2>
      <p>The requested page does not exist in the current media catalog.</p>
      <Link href="/" className="primary-link">
        Return Home
      </Link>
    </main>
  );
}
