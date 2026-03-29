import { NextResponse } from "next/server";
import { getFeaturedVideo } from "@/lib/services/media";

export async function GET() {
  try {
    const featuredVideo = await getFeaturedVideo();
    return NextResponse.json(featuredVideo);
  } catch (error) {
    console.error("Featured video request failed", error);

    return NextResponse.json(
      {
        error: "Failed to load featured video",
      },
      { status: 500 },
    );
  }
}
