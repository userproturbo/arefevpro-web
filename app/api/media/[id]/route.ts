import { NextResponse } from "next/server";
import { deleteMediaById, MediaServiceError } from "@/lib/services/media";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const result = await deleteMediaById(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MediaServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Media delete request failed", { id, error });
    return NextResponse.json({ error: "Failed to delete media" }, { status: 500 });
  }
}
