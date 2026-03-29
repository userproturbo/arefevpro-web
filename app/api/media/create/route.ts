import { NextResponse } from "next/server";
import { createMedia, MediaServiceError } from "@/lib/services/media";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const createdMedia = await createMedia(body);

    return NextResponse.json(createdMedia, { status: 201 });
  } catch (error) {
    if (error instanceof MediaServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Unexpected error while creating media", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
