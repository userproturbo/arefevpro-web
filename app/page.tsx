import { HomeHero } from "@/components/home-hero";
import { getFeaturedVideo } from "@/lib/services/media";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const featuredVideo = await getFeaturedVideo();

  return <HomeHero video={featuredVideo} />;
}
