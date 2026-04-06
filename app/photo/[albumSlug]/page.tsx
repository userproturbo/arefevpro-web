import { notFound } from "next/navigation";
import { ViewerLayout } from "@/components/viewer-layout";
import { getSectionPageData } from "@/lib/services/sections";

export const dynamic = "force-dynamic";

type PhotoAlbumPageProps = {
  params: Promise<{
    albumSlug: string;
  }>;
};

export default async function PhotoAlbumPage({ params }: PhotoAlbumPageProps) {
  const { albumSlug } = await params;
  const page = await getSectionPageData("photo");

  if (!page) {
    notFound();
  }

  const albumExists = page.albums.some((album) => album.slug === albumSlug);

  if (!albumExists) {
    notFound();
  }

  return <ViewerLayout page={page} initialAlbumSlug={albumSlug} />;
}
