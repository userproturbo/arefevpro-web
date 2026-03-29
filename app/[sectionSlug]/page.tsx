import { notFound } from "next/navigation";
import { SectionShell } from "@/components/section-shell";
import { getSectionPageData, listSections } from "@/lib/services/sections";

export const dynamic = "force-dynamic";

type SectionPageProps = {
  params: Promise<{
    sectionSlug: string;
  }>;
};

export default async function SectionPage({ params }: SectionPageProps) {
  const { sectionSlug } = await params;
  const [page, sections] = await Promise.all([
    getSectionPageData(sectionSlug),
    listSections(),
  ]);

  if (!page) {
    notFound();
  }

  return <SectionShell page={page} sections={sections} />;
}
