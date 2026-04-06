import { NextResponse } from "next/server";
import { deleteTrack, MusicServiceError, updateTrack } from "@/lib/services/music";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let body: unknown;

  try {
    body = (await request.json()) as unknown;
    const track = await updateTrack(id, body);
    return NextResponse.json(track);
  } catch (error) {
    if (error instanceof MusicServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Track update request failed", { id, body, error });
    return NextResponse.json({ error: "Failed to update track" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const result = await deleteTrack(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MusicServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Track delete request failed", { id, error });
    return NextResponse.json({ error: "Failed to delete track" }, { status: 500 });
  }
}
