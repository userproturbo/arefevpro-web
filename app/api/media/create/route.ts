import { NextResponse } from "next/server";
import { createMedia, MediaServiceError } from "@/lib/services/media";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = (await request.json()) as unknown;
    const createdMedia = await createMedia(body);

    return NextResponse.json(createdMedia, { status: 201 });
  } catch (error) {
    console.error("Media create request failed", {
      body,
      error,
    });

    if (error instanceof MediaServiceError) {
      return NextResponse.json(
        {
          error: error.message,
          details: "Проверьте тип файла, размеры, длительность и выбранный альбом.",
        },
        { status: error.status },
      );
    }

    console.error("Unexpected error while creating media", error);
    return NextResponse.json(
      {
        error: "Не удалось создать файл",
        details: "Смотрите серверные логи для полного тела запроса.",
      },
      { status: 500 },
    );
  }
}
