import { NextResponse } from "next/server";
import { getFeaturedVideo } from "@/lib/services/media";

export async function GET() {
  try {
    const featuredVideo = await getFeaturedVideo();

    return NextResponse.json({
      item: featuredVideo ?? null,
    });
  } catch (error) {
    console.error("Featured video request failed", error);

    return NextResponse.json(
      {
        item: null,
        error: "Failed to load featured video",
      },
      { status: 500 },
    );
  }
}
