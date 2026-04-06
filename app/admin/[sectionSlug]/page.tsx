import { notFound } from "next/navigation";
import { AdminSectionManager } from "@/components/admin/admin-section-manager";
import { listSections } from "@/lib/services/sections";

export const dynamic = "force-dynamic";

type AdminSectionPageProps = {
  params: Promise<{
    sectionSlug: string;
  }>;
};

export default async function AdminSectionPage({ params }: AdminSectionPageProps) {
  const { sectionSlug } = await params;
  const sections = await listSections();
  const section = sections.find((item) => item.slug === sectionSlug) ?? null;

  if (!section) {
    notFound();
  }

  return <AdminSectionManager currentSection={section} />;
}
