import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { MainNav } from '@/components/navigation/main-nav';

export const metadata: Metadata = {
  title: 'ArefevPro',
  description: 'A dark-first media platform architecture scaffold.',
};

type SiteLayoutProps = {
  children: ReactNode;
};

export default function SiteLayout({ children }: SiteLayoutProps) {
  return (
    <div className="relative min-h-screen bg-background">
      <MainNav />
      <main className="container flex min-h-screen w-full flex-col px-6 pb-10 pt-24 md:px-8">
        {children}
      </main>
    </div>
  );
}
