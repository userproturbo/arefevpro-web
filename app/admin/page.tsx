import { AdminPanel } from "@/components/admin/admin-panel";
import { listAllAlbums } from "@/lib/services/albums";
import { listSections } from "@/lib/services/sections";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [albums, sections] = await Promise.all([listAllAlbums(), listSections()]);

  return <AdminPanel initialAlbums={albums} sections={sections} />;
}
