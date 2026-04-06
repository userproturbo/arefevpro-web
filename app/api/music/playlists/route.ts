import { NextResponse } from "next/server";
import { createPlaylist, listPlaylists, MusicServiceError } from "@/lib/services/music";

export async function GET() {
  try {
    const playlists = await listPlaylists({ includeTracks: true });
    return NextResponse.json(playlists);
  } catch (error) {
    console.error("Playlist list request failed", error);
    return NextResponse.json({ error: "Failed to load playlists" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = (await request.json()) as unknown;
    const playlist = await createPlaylist(body);
    return NextResponse.json(playlist, { status: 201 });
  } catch (error) {
    if (error instanceof MusicServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Playlist create request failed", { body, error });
    return NextResponse.json({ error: "Failed to create playlist" }, { status: 500 });
  }
}
