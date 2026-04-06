import { NextResponse } from "next/server";
import { createTrack, MusicServiceError } from "@/lib/services/music";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let body: unknown;

  try {
    body = (await request.json()) as unknown;
    const payload =
      typeof body === "object" && body !== null
        ? { ...(body as Record<string, unknown>), playlistId: id }
        : body;
    const track = await createTrack(payload);
    return NextResponse.json(track, { status: 201 });
  } catch (error) {
    if (error instanceof MusicServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Track create request failed", { playlistId: id, body, error });
    return NextResponse.json({ error: "Failed to create track" }, { status: 500 });
  }
}
