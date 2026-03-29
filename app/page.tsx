import Link from "next/link";
import { getFeaturedVideo } from "@/lib/services/media";
import { listSections } from "@/lib/services/sections";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [heroVideo, sections] = await Promise.all([getFeaturedVideo(), listSections()]);

  return (
    <main className="home-page">
      {heroVideo ? (
        <video
          className="home-hero-video"
          src={heroVideo.videoUrl}
          poster={heroVideo.posterUrl ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
      ) : (
        <div className="home-hero-fallback" aria-hidden="true" />
      )}

      <div className="home-overlay" aria-hidden="true" />

      <header className="home-header">
        <div className="brand-mark">
          <span className="brand-kicker">Arefev</span>
          <span className="brand-title">Cinematic Portfolio</span>
        </div>

        <nav className="home-nav">
          {sections.map((section) => (
            <Link key={section.id} href={`/${section.slug}`}>
              {section.title}
            </Link>
          ))}
        </nav>
      </header>

      <section className="home-copy">
        <div className="home-copy-block">
          <p className="eyebrow">Cinematic Portfolio</p>
          <h1>Motion and stillness held in one dark, minimal frame.</h1>
        </div>

        <div className="home-copy-block">
          <p className="home-summary">
            A reusable portfolio system for films, photography, and future editorial sections.
          </p>

          <div className="home-actions">
            <Link href="/video" className="primary-link">
              Enter Video
            </Link>
            <Link href="/photo" className="secondary-link">
              Enter Photo
            </Link>
          </div>

          <p className="home-caption">
            {heroVideo ? (
              <>
                Now showing <span>{heroVideo.title}</span>.
              </>
            ) : (
              "Publish a featured video to activate the fullscreen hero background."
            )}
          </p>
        </div>
      </section>
    </main>
  );
}
