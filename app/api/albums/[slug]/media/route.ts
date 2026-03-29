import { NextResponse } from "next/server";
import { AlbumServiceError, getAlbumMediaById } from "@/lib/services/albums";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { slug } = await context.params;

  try {
    const media = await getAlbumMediaById(slug);
    return NextResponse.json(media);
  } catch (error) {
    if (error instanceof AlbumServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to load album media", { id: slug, error });
    return NextResponse.json({ error: "Failed to load album media" }, { status: 500 });
  }
}
