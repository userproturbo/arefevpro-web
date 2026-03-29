import { NextResponse } from "next/server";
import { AlbumServiceError, createAlbum } from "@/lib/services/albums";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const album = await createAlbum(body);

    return NextResponse.json(album, { status: 201 });
  } catch (error) {
    if (error instanceof AlbumServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Unexpected error while creating album", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
