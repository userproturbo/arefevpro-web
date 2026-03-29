import { AdminPanel } from "@/components/admin/admin-panel";
import { listSections } from "@/lib/services/sections";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const sections = await listSections();

  return <AdminPanel sections={sections} />;
}
