import { NextResponse } from "next/server";
import {
  deletePlaylist,
  getPlaylistById,
  MusicServiceError,
  updatePlaylist,
} from "@/lib/services/music";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const playlist = await getPlaylistById(id);

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    return NextResponse.json(playlist);
  } catch (error) {
    console.error("Playlist fetch request failed", { id, error });
    return NextResponse.json({ error: "Failed to load playlist" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let body: unknown;

  try {
    body = (await request.json()) as unknown;
    const playlist = await updatePlaylist(id, body);
    return NextResponse.json(playlist);
  } catch (error) {
    if (error instanceof MusicServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Playlist update request failed", { id, body, error });
    return NextResponse.json({ error: "Failed to update playlist" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const result = await deletePlaylist(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MusicServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Playlist delete request failed", { id, error });
    return NextResponse.json({ error: "Failed to delete playlist" }, { status: 500 });
  }
}
