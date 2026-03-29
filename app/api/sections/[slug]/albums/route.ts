import { NextResponse } from "next/server";
import { listAlbumsBySection } from "@/lib/services/albums";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { slug } = await context.params;
  const albums = await listAlbumsBySection(slug);

  return NextResponse.json(albums);
}
