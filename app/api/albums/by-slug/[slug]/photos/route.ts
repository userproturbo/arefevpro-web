import { NextResponse } from "next/server";
import { getAlbumPhotos } from "@/lib/services/albums";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { slug } = await context.params;
  const photos = await getAlbumPhotos(slug);

  return NextResponse.json(photos);
}
