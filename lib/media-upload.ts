const MB = 1024 * 1024;

export type UploadMediaKind = "IMAGE" | "VIDEO";

export const MEDIA_MIME_TYPES_BY_KIND: Record<UploadMediaKind, readonly string[]> = {
  IMAGE: ["image/jpeg", "image/png"],
  VIDEO: ["video/mp4", "video/webm"],
};

export const MEDIA_SECTION_SLUG_BY_KIND: Record<UploadMediaKind, "photo" | "video"> = {
  IMAGE: "photo",
  VIDEO: "video",
};

export const MEDIA_UPLOAD_SIZE_LIMITS_BYTES: Record<UploadMediaKind, number> = {
  IMAGE: 20 * MB,
  VIDEO: 500 * MB,
};

export function normalizeMimeType(mimeType: string): string {
  return mimeType.trim().toLowerCase();
}

export function isUploadMediaKind(value: unknown): value is UploadMediaKind {
  return value === "IMAGE" || value === "VIDEO";
}

export function inferUploadMediaKind(mimeType: string): UploadMediaKind | null {
  const normalizedMimeType = normalizeMimeType(mimeType);

  if (MEDIA_MIME_TYPES_BY_KIND.IMAGE.includes(normalizedMimeType)) {
    return "IMAGE";
  }

  if (MEDIA_MIME_TYPES_BY_KIND.VIDEO.includes(normalizedMimeType)) {
    return "VIDEO";
  }

  return null;
}

export function isAllowedMimeTypeForKind(kind: UploadMediaKind, mimeType: string): boolean {
  return MEDIA_MIME_TYPES_BY_KIND[kind].includes(normalizeMimeType(mimeType));
}

export function getUploadSizeLimitBytes(kind: UploadMediaKind): number {
  return MEDIA_UPLOAD_SIZE_LIMITS_BYTES[kind];
}

export function formatFileSize(bytes: number): string {
  if (bytes < MB) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / MB).toFixed(1)} MB`;
}
