import Link from 'next/link';

const navigationItems = [
  { href: '/photo', label: 'Photo' },
  { href: '/video', label: 'Video' },
  { href: '/blog', label: 'Blog' },
  { href: '/music', label: 'Music' },
] as const;

export function MainNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between px-6 md:px-8">
        <Link className="text-sm font-medium uppercase tracking-[0.28em]" href="/">
          ArefevPro
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-3 text-sm text-muted-foreground">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              className="rounded-full px-3 py-2 transition hover:bg-card hover:text-foreground"
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
