import type { Metadata } from "next";
import { AudioPlayerProvider } from "@/components/audio-player";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/layout.css";
import "@/styles/components.css";
import "@/styles/home.css";
import "@/styles/photo.css";
import "@/styles/video.css";
import "@/styles/music.css";
import "@/styles/blog.css";
import "@/styles/admin.css";

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
      <body>
        <AudioPlayerProvider>{children}</AudioPlayerProvider>
      </body>
    </html>
  );
}
