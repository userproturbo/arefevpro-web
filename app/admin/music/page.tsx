import { AdminMusicManager } from "@/components/admin/admin-music-manager";
import { listPlaylists } from "@/lib/services/music";

export const dynamic = "force-dynamic";

export default async function AdminMusicPage() {
  const playlists = await listPlaylists({ includeTracks: true });
  return <AdminMusicManager initialPlaylists={playlists} />;
}
