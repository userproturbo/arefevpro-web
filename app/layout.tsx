import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "arefevpro-web",
  description: "Initial Next.js project setup",
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
