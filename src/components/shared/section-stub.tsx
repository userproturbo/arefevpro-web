type SectionStubProps = {
  title: string;
};

export function SectionStub({ title }: SectionStubProps) {
  return (
    <section className="flex min-h-[calc(100vh-6rem)] items-center justify-center">
      <div className="space-y-3 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
          Section
        </p>
        <h1 className="text-4xl font-semibold tracking-display md:text-6xl">{title}</h1>
      </div>
    </section>
  );
}
