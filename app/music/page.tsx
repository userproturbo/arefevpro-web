import { MusicPage } from "@/components/music-page";
import { getMusicPageData } from "@/lib/services/music";

export const dynamic = "force-dynamic";

export default async function MusicSectionPage() {
  const page = await getMusicPageData();
  return <MusicPage page={page} />;
}
