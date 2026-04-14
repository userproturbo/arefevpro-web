import "@/styles/components.css";
import "@/styles/home.css";
import { HomeHero } from "@/components/home-hero";
import { getFeaturedVideos } from "@/lib/services/media";

export const revalidate = 60;

export default async function HomePage() {
  const featuredVideos = await getFeaturedVideos();

  return <HomeHero videos={featuredVideos} />;
}
