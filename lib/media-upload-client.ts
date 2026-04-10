"use client";

import {
  formatFileSize,
  getUploadSizeLimitBytes,
  isAllowedMimeTypeForKind,
  MEDIA_SECTION_SLUG_BY_KIND,
  type UploadMediaKind,
} from "@/lib/media-upload";

type UploadMediaKindInfo = {
  value: UploadMediaKind;
  sectionSlug: "photo" | "video";
  label: string;
  maxSizeBytes: number;
};

type PresignedUploadResponse = {
  uploadUrl: string;
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  headers: Record<string, string>;
  expiresIn: number;
};

export type UploadedMediaFile = {
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  size: number;
};

export function getUploadMediaKind(file: File): UploadMediaKindInfo | null {
  if (isAllowedMimeTypeForKind("VIDEO", file.type)) {
    return {
      value: "VIDEO",
      sectionSlug: MEDIA_SECTION_SLUG_BY_KIND.VIDEO,
      label: "Видео",
      maxSizeBytes: getUploadSizeLimitBytes("VIDEO"),
    };
  }

  if (isAllowedMimeTypeForKind("IMAGE", file.type)) {
    return {
      value: "IMAGE",
      sectionSlug: MEDIA_SECTION_SLUG_BY_KIND.IMAGE,
      label: "Изображения",
      maxSizeBytes: getUploadSizeLimitBytes("IMAGE"),
    };
  }

  return null;
}

export function validateMediaFileBeforeUpload(
  file: File,
  expectedSectionSlug?: string,
): string | null {
  const kind = getUploadMediaKind(file);

  if (!kind) {
    return "Поддерживаются только файлы MP4, WEBM, JPEG и PNG";
  }

  if (expectedSectionSlug && expectedSectionSlug !== kind.sectionSlug) {
    return `${kind.label} можно загружать только в раздел ${kind.sectionSlug.toUpperCase()}`;
  }

  if (file.size === 0) {
    return "Файл не должен быть пустым";
  }

  if (file.size > kind.maxSizeBytes) {
    return `Файл слишком большой. Лимит: ${formatFileSize(kind.maxSizeBytes)}`;
  }

  return null;
}

export async function uploadMediaFileDirect(input: {
  file: File;
  albumId: string;
  kind: UploadMediaKind;
  onProgress?: (progress: number) => void;
}): Promise<UploadedMediaFile> {
  const presignedUpload = await requestPresignedUpload(input);

  await uploadFileToPresignedUrl({
    file: input.file,
    presignedUpload,
    onProgress: input.onProgress,
  });

  return {
    storageKey: presignedUpload.storageKey,
    publicUrl: presignedUpload.publicUrl,
    mimeType: presignedUpload.mimeType,
    size: input.file.size,
  };
}

export async function cleanupDirectUpload(storageKey: string): Promise<void> {
  const response = await fetch("/api/upload/cleanup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ storageKey }),
  });

  if (!response.ok) {
    throw new Error("Не удалось удалить файл из хранилища после ошибки");
  }
}

export async function readMediaFileMetadata(
  file: File,
  kind: UploadMediaKind,
): Promise<{ width: number | null; height: number | null; durationSec: number | null }> {
  const objectUrl = URL.createObjectURL(file);

  try {
    if (kind === "IMAGE") {
      const image = await loadImage(objectUrl);
      return {
        width: image.naturalWidth,
        height: image.naturalHeight,
        durationSec: null,
      };
    }

    const video = await loadVideo(objectUrl);
    return {
      width: video.videoWidth,
      height: video.videoHeight,
      durationSec: Math.round(video.duration),
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function requestPresignedUpload(input: {
  file: File;
  albumId: string;
  kind: UploadMediaKind;
}): Promise<PresignedUploadResponse> {
  const response = await fetch("/api/upload/presign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filename: input.file.name,
      mimeType: input.file.type,
      sizeBytes: input.file.size,
      albumId: input.albumId,
      kind: input.kind,
    }),
  });

  const payload = (await response.json()) as
    | PresignedUploadResponse
    | {
        error?: string;
      };

  if (!response.ok || !isPresignedUploadResponse(payload)) {
    throw new Error(
      ("error" in payload && typeof payload.error === "string" && payload.error) ||
        "Не удалось подготовить загрузку файла",
    );
  }

  return payload;
}

function uploadFileToPresignedUrl(input: {
  file: File;
  presignedUpload: PresignedUploadResponse;
  onProgress?: (progress: number) => void;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open("PUT", input.presignedUpload.uploadUrl);

    for (const [headerName, headerValue] of Object.entries(input.presignedUpload.headers)) {
      request.setRequestHeader(headerName, headerValue);
    }

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || !input.onProgress) {
        return;
      }

      input.onProgress(Math.min(Math.round((event.loaded / event.total) * 100), 100));
    };

    request.onerror = () => reject(new Error("Ошибка загрузки файла"));
    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error("Не удалось загрузить файл в хранилище"));
        return;
      }

      input.onProgress?.(100);
      resolve();
    };

    request.send(input.file);
  });
}

function isPresignedUploadResponse(value: unknown): value is PresignedUploadResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as PresignedUploadResponse;

  return (
    typeof candidate.uploadUrl === "string" &&
    typeof candidate.storageKey === "string" &&
    typeof candidate.publicUrl === "string" &&
    typeof candidate.mimeType === "string" &&
    typeof candidate.headers === "object" &&
    candidate.headers !== null
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Не удалось прочитать параметры изображения"));
    image.src = src;
  });
}

function loadVideo(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new Error("Не удалось прочитать параметры видео"));
    video.src = src;
  });
}
