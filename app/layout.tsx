import type { Metadata, Viewport } from "next";
import { AudioPlayerProvider } from "@/components/audio-player";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/layout.css";

export const metadata: Metadata = {
  title: "AREFEVPRO",
  description: "Cinematic portfolio and media CMS",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <AudioPlayerProvider>{children}</AudioPlayerProvider>
      </body>
    </html>
  );
}
