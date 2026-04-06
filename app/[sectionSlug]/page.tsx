import { notFound } from "next/navigation";
import { ViewerLayout } from "@/components/viewer-layout";
import { getSectionPageData } from "@/lib/services/sections";

export const dynamic = "force-dynamic";

type SectionPageProps = {
  params: Promise<{
    sectionSlug: string;
  }>;
};

export default async function SectionPage({ params }: SectionPageProps) {
  const { sectionSlug } = await params;
  const page = await getSectionPageData(sectionSlug);

  if (!page) {
    notFound();
  }

  return <ViewerLayout page={page} />;
}
