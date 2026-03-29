import { NextResponse } from "next/server";
import { getAlbumVideos } from "@/lib/services/albums";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { slug } = await context.params;
  const videos = await getAlbumVideos(slug);

  return NextResponse.json(videos);
}
