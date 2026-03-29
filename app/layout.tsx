import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arefev Portfolio",
  description: "Cinematic portfolio and media CMS",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
