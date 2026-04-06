import { Prisma, SectionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateUniqueAlbumSlug, slugify } from "@/lib/services/slugs";

export type CreateAlbumInput = {
  sectionSlug: string;
  title: string;
  slug?: string;
  description?: string;
  isPublished?: boolean;
};

export type UpdateAlbumInput = {
  title?: string;
  slug?: string;
  description?: string;
};

export type AlbumCard = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  isPublished: boolean;
  coverUrl: string | null;
  itemCount: number;
  sectionSlug: string;
};

export type AdminAlbumCard = AlbumCard & {
  createdAt: string;
};

export type AdminMediaItem = {
  id: string;
  title: string;
  kind: "VIDEO" | "IMAGE";
  previewUrl: string;
  mediaUrl: string;
  thumbnailUrl: string | null;
  durationSec: number | null;
  isPublished: boolean;
  isFeatured: boolean;
  createdAt: string;
};

export type VideoListItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  order: number;
  durationSec: number | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  createdAt: string;
};

export type PhotoListItem = {
  id: string;
  title: string;
  slug: string | null;
  order: number;
  width: number | null;
  height: number | null;
  imageUrl: string;
  thumbnailUrl: string | null;
  createdAt: string;
};

export class AlbumServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AlbumServiceError";
  }
}

export async function createAlbum(rawInput: unknown): Promise<AlbumCard> {
  const input = parseCreateAlbumInput(rawInput);

  const section = await prisma.section.findUnique({
    where: { slug: input.sectionSlug },
    select: { id: true, slug: true },
  });

  if (!section) {
    throw new AlbumServiceError("Section not found", 404);
  }

  const slug = input.slug
    ? await ensureAlbumSlugAvailable(input.slug)
    : await generateUniqueAlbumSlug(input.title);

  try {
    const album = await prisma.album.create({
      data: {
        title: input.title,
        slug,
        description: input.description,
        sectionId: section.id,
        isPublished: input.isPublished ?? false,
      },
      include: {
        section: {
          select: {
            slug: true,
          },
        },
        cover: {
          select: {
            publicUrl: true,
          },
        },
        _count: {
          select: {
            videos: true,
            mediaFiles: {
              where: {
                kind: "IMAGE",
              },
            },
          },
        },
      },
    });

    return {
      id: album.id,
      title: album.title,
      slug: album.slug,
      description: album.description,
      isPublished: album.isPublished,
      coverUrl: album.cover?.publicUrl ?? null,
      itemCount: album._count.videos + album._count.mediaFiles,
      sectionSlug: album.section.slug,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AlbumServiceError("Album slug already exists", 409);
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      throw new AlbumServiceError("Invalid album payload", 400);
    }

    throw error;
  }
}

export async function deleteAlbumById(albumId: string): Promise<{ id: string }> {
  const album = await prisma.album.findUnique({
    where: { id: albumId },
    select: { id: true },
  });

  if (!album) {
    throw new AlbumServiceError("Album not found", 404);
  }

  await prisma.album.delete({
    where: { id: albumId },
  });

  return { id: albumId };
}

export async function updateAlbumById(albumId: string, rawInput: unknown): Promise<AlbumCard> {
  const input = parseUpdateAlbumInput(rawInput);

  const album = await prisma.album.findUnique({
    where: { id: albumId },
    select: { id: true },
  });

  if (!album) {
    throw new AlbumServiceError("Album not found", 404);
  }

  const nextSlug = input.slug ? await ensureAlbumSlugAvailable(input.slug, albumId) : undefined;

  try {
    const updatedAlbum = await prisma.album.update({
      where: { id: albumId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(nextSlug !== undefined ? { slug: nextSlug } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
      include: {
        section: {
          select: {
            slug: true,
          },
        },
        cover: {
          select: {
            publicUrl: true,
          },
        },
        _count: {
          select: {
            videos: true,
            mediaFiles: {
              where: {
                kind: "IMAGE",
              },
            },
          },
        },
      },
    });

    return {
      id: updatedAlbum.id,
      title: updatedAlbum.title,
      slug: updatedAlbum.slug,
      description: updatedAlbum.description,
      isPublished: updatedAlbum.isPublished,
      coverUrl: updatedAlbum.cover?.publicUrl ?? null,
      itemCount: updatedAlbum._count.videos + updatedAlbum._count.mediaFiles,
      sectionSlug: updatedAlbum.section.slug,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AlbumServiceError("Album slug already exists", 409);
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      throw new AlbumServiceError("Invalid album payload", 400);
    }

    throw error;
  }
}

export async function getAlbumById(id: string): Promise<AlbumCard | null> {
  const album = await prisma.album.findUnique({
    where: { id },
    include: {
      section: {
        select: {
          slug: true,
        },
      },
      cover: {
        select: {
          publicUrl: true,
        },
      },
      _count: {
        select: {
          videos: true,
          mediaFiles: {
            where: {
              kind: "IMAGE",
            },
          },
        },
      },
    },
  });

  if (!album) {
    return null;
  }

  return {
    id: album.id,
    title: album.title,
    slug: album.slug,
    description: album.description,
    isPublished: album.isPublished,
    coverUrl: album.cover?.publicUrl ?? null,
    itemCount: album._count.videos + album._count.mediaFiles,
    sectionSlug: album.section.slug,
  };
}

export async function getAlbumBySlug(slug: string): Promise<AlbumCard | null> {
  const album = await prisma.album.findFirst({
    where: { slug, isPublished: true },
    include: {
      section: {
        select: {
          slug: true,
        },
      },
      cover: {
        select: {
          publicUrl: true,
        },
      },
      _count: {
        select: {
          videos: {
            where: {
              isPublished: true,
            },
          },
          mediaFiles: {
            where: {
              kind: "IMAGE",
              isPublished: true,
            },
          },
        },
      },
    },
  });

  if (!album) {
    return null;
  }

  return {
    id: album.id,
    title: album.title,
    slug: album.slug,
    description: album.description,
    isPublished: album.isPublished,
    coverUrl: album.cover?.publicUrl ?? null,
    itemCount: album._count.videos + album._count.mediaFiles,
    sectionSlug: album.section.slug,
  };
}

export async function listAllAlbums(): Promise<AlbumCard[]> {
  const albums = await prisma.album.findMany({
    orderBy: [
      {
        section: {
          order: "asc",
        },
      },
      { order: "asc" },
      { createdAt: "desc" },
    ],
    include: {
      section: {
        select: {
          slug: true,
        },
      },
      cover: {
        select: {
          publicUrl: true,
        },
      },
      _count: {
        select: {
          videos: true,
          mediaFiles: {
            where: {
              kind: "IMAGE",
            },
          },
        },
      },
    },
  });

  return albums.map((album) => ({
    id: album.id,
    title: album.title,
    slug: album.slug,
    description: album.description,
    isPublished: album.isPublished,
    coverUrl: album.cover?.publicUrl ?? null,
    itemCount: album._count.videos + album._count.mediaFiles,
    sectionSlug: album.section.slug,
  }));
}

export async function listAlbumsBySection(sectionSlug: string): Promise<AdminAlbumCard[]> {
  const albums = await prisma.album.findMany({
    where: {
      section: {
        slug: sectionSlug,
      },
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: {
      section: {
        select: {
          slug: true,
        },
      },
      cover: {
        select: {
          publicUrl: true,
        },
      },
      _count: {
        select: {
          videos: true,
          mediaFiles: {
            where: {
              kind: "IMAGE",
            },
          },
        },
      },
    },
  });

  return albums.map((album) => ({
    id: album.id,
    title: album.title,
    slug: album.slug,
    description: album.description,
    isPublished: album.isPublished,
    coverUrl: album.cover?.publicUrl ?? null,
    itemCount: album._count.videos + album._count.mediaFiles,
    sectionSlug: album.section.slug,
    createdAt: album.createdAt.toISOString(),
  }));
}

export async function getAlbumMediaById(albumId: string): Promise<AdminMediaItem[]> {
  const album = await prisma.album.findUnique({
    where: {
      id: albumId,
    },
    select: {
      videos: {
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          isPublished: true,
          isFeatured: true,
          createdAt: true,
          videoFile: {
            select: {
              id: true,
              publicUrl: true,
              durationSec: true,
            },
          },
          thumbnail: {
            select: {
              publicUrl: true,
            },
          },
        },
      },
      mediaFiles: {
        where: {
          kind: "IMAGE",
        },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          isPublished: true,
          createdAt: true,
          publicUrl: true,
        },
      },
    },
  });

  if (!album) {
    throw new AlbumServiceError("Album not found", 404);
  }

  const videos: AdminMediaItem[] = album.videos.map((video) => ({
    id: video.videoFile.id,
    title: video.title,
    kind: "VIDEO",
    previewUrl: video.thumbnail?.publicUrl ?? video.videoFile.publicUrl,
    mediaUrl: video.videoFile.publicUrl,
    thumbnailUrl: video.thumbnail?.publicUrl ?? null,
    durationSec: video.videoFile.durationSec,
    isPublished: video.isPublished,
    isFeatured: video.isFeatured,
    createdAt: video.createdAt.toISOString(),
  }));

  const images: AdminMediaItem[] = album.mediaFiles.map((photo) => ({
    id: photo.id,
    title: photo.title ?? "Untitled Image",
    kind: "IMAGE",
    previewUrl: photo.publicUrl,
    mediaUrl: photo.publicUrl,
    thumbnailUrl: photo.publicUrl,
    durationSec: null,
    isPublished: photo.isPublished,
    isFeatured: false,
    createdAt: photo.createdAt.toISOString(),
  }));

  return [...videos, ...images].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

export async function getAlbumVideos(slug: string): Promise<VideoListItem[]> {
  const album = await prisma.album.findFirst({
    where: {
      slug,
      isPublished: true,
      section: {
        type: SectionType.VIDEO,
      },
    },
    select: {
      videos: {
        where: {
          isPublished: true,
        },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          order: true,
          createdAt: true,
          videoFile: {
            select: {
              publicUrl: true,
              durationSec: true,
            },
          },
          thumbnail: {
            select: {
              publicUrl: true,
            },
          },
        },
      },
    },
  });

  return (
    album?.videos.map((video) => ({
      id: video.id,
      title: video.title,
      slug: video.slug,
      description: video.description,
      order: video.order,
      durationSec: video.videoFile.durationSec,
      videoUrl: video.videoFile.publicUrl,
      thumbnailUrl: video.thumbnail?.publicUrl ?? null,
      createdAt: video.createdAt.toISOString(),
    })) ?? []
  );
}

export async function getAlbumPhotos(slug: string): Promise<PhotoListItem[]> {
  const album = await prisma.album.findFirst({
    where: {
      slug,
      isPublished: true,
      section: {
        type: SectionType.PHOTO,
      },
    },
    select: {
      mediaFiles: {
        where: {
          kind: "IMAGE",
          isPublished: true,
        },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          slug: true,
          order: true,
          width: true,
          height: true,
          publicUrl: true,
          createdAt: true,
        },
      },
    },
  });

  return (
    album?.mediaFiles.map((photo) => ({
      id: photo.id,
      title: photo.title ?? "Untitled Image",
      slug: photo.slug,
      order: photo.order,
      width: photo.width,
      height: photo.height,
      imageUrl: photo.publicUrl,
      thumbnailUrl: photo.publicUrl,
      createdAt: photo.createdAt.toISOString(),
    })) ?? []
  );
}

function parseCreateAlbumInput(rawInput: unknown): CreateAlbumInput {
  if (!isRecord(rawInput)) {
    throw new AlbumServiceError("Request body must be a JSON object", 400);
  }

  const sectionSlug = parseRequiredString(rawInput.sectionSlug, "sectionSlug");
  const title = parseRequiredString(rawInput.title, "title");
  const slug = parseOptionalString(rawInput.slug, "slug");
  const description = parseOptionalString(rawInput.description, "description");
  const isPublished = parseOptionalBoolean(rawInput.isPublished, "isPublished");

  return {
    sectionSlug,
    title,
    slug,
    description,
    isPublished,
  };
}

function parseUpdateAlbumInput(rawInput: unknown): UpdateAlbumInput {
  if (!isRecord(rawInput)) {
    throw new AlbumServiceError("Request body must be a JSON object", 400);
  }

  return {
    title: parseOptionalString(rawInput.title, "title"),
    slug: parseOptionalString(rawInput.slug, "slug"),
    description: parseOptionalString(rawInput.description, "description"),
  };
}

function parseRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AlbumServiceError(`${fieldName} is required`, 400);
  }

  return value.trim();
}

function parseOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value == null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new AlbumServiceError(`${fieldName} must be a string`, 400);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseOptionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value == null) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new AlbumServiceError(`${fieldName} must be a boolean`, 400);
  }

  return value;
}

async function ensureAlbumSlugAvailable(value: string, currentAlbumId?: string): Promise<string> {
  const normalizedSlug = slugify(value);

  if (!normalizedSlug) {
    throw new AlbumServiceError("slug is invalid", 400);
  }

  const existingAlbum = await prisma.album.findUnique({
    where: { slug: normalizedSlug },
    select: { id: true },
  });

  if (existingAlbum && existingAlbum.id !== currentAlbumId) {
    throw new AlbumServiceError("Album slug already exists", 409);
  }

  return normalizedSlug;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
