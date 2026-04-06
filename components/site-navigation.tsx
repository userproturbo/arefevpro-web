"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SiteNavigationProps = {
  className?: string;
};

const navigationItems = [
  { href: "/", label: "Главная" },
  { href: "/photo", label: "Фото" },
  { href: "/video", label: "Видео" },
  { href: "/music", label: "Музыка" },
  { href: "/blog", label: "Блог" },
];

export function SiteNavigation({ className }: SiteNavigationProps) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const navClassName = className ? `site-nav ${className}` : "site-nav";

  return (
    <nav className={navClassName} aria-label="Основная навигация">
      <div className="nav-left">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            href={resolveHref(item.href, isAdmin)}
            className={getNavLinkClassName(item.href, pathname, isAdmin)}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="nav-right">
        <Link href={isAdmin ? "/admin" : "/"} className="site-brand">
          {isAdmin ? <span className="site-brand-admin">АДМИНКА</span> : null}
          AREFEVPRO
        </Link>
      </div>
    </nav>
  );
}

function getNavLinkClassName(href: string, pathname: string, isAdmin: boolean) {
  const normalizedPath = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
  const targetHref = resolveHref(href, isAdmin);

  if (isPathActive(normalizedPath, targetHref)) {
    return "nav-link active";
  }

  return "nav-link";
}

function isPathActive(pathname: string, targetHref: string) {
  if (targetHref === "/" || targetHref === "/admin") {
    return pathname === targetHref;
  }

  return pathname.startsWith(targetHref);
}

function resolveHref(href: string, isAdmin: boolean) {
  if (!isAdmin) {
    return href;
  }

  if (href === "/") {
    return "/admin";
  }

  return `/admin${href}`;
}
