export default function HomePage() {
  return (
    <section className="flex min-h-[calc(100vh-6rem)] items-center justify-center">
      <div className="space-y-4 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground">
          Media Platform
        </p>
        <h1 className="text-5xl font-semibold tracking-display text-foreground md:text-7xl">
          ArefevPro
        </h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground md:text-base">
          Minimal full-stack foundation for photo, video, blog, and music.
        </p>
      </div>
    </section>
  );
}
