import { NextResponse } from "next/server";
import { AlbumServiceError, deleteAlbumById, getAlbumById, updateAlbumById } from "@/lib/services/albums";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const result = await deleteAlbumById(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AlbumServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Album delete request failed", { id, error });
    return NextResponse.json({ error: "Failed to delete album" }, { status: 500 });
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const album = await getAlbumById(id);

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    return NextResponse.json(album);
  } catch (error) {
    console.error("Album fetch request failed", { id, error });
    return NextResponse.json({ error: "Failed to load album" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let body: unknown;

  try {
    body = (await request.json()) as unknown;
    const album = await updateAlbumById(id, body);
    return NextResponse.json(album);
  } catch (error) {
    if (error instanceof AlbumServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Album update request failed", { id, body, error });
    return NextResponse.json({ error: "Failed to update album" }, { status: 500 });
  }
}
