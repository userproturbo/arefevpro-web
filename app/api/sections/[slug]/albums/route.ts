import { NextResponse } from "next/server";
import { getSectionAlbums } from "@/lib/services/sections";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { slug } = await context.params;
  const albums = await getSectionAlbums(slug);

  return NextResponse.json(albums);
}
