import { NextResponse } from "next/server";
import { getAlbumBySlug } from "@/lib/services/albums";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { slug } = await context.params;
  const album = await getAlbumBySlug(slug);

  if (!album) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  return NextResponse.json(album);
}
