import { NextResponse } from "next/server";
import { AlbumServiceError, getAlbumMediaById } from "@/lib/services/albums";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const media = await getAlbumMediaById(id);
    return NextResponse.json(media);
  } catch (error) {
    if (error instanceof AlbumServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to load album media", { id, error });
    return NextResponse.json({ error: "Failed to load album media" }, { status: 500 });
  }
}
