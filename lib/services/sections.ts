import { SectionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAlbumPhotos, getAlbumVideos, type AlbumCard, type PhotoListItem, type VideoListItem } from "@/lib/services/albums";

export type SectionSummary = {
  id: string;
  type: SectionType;
  title: string;
  slug: string;
  order: number;
  albumCount: number;
};

export type SectionDetail = {
  id: string;
  type: SectionType;
  title: string;
  slug: string;
  order: number;
  albumCount: number;
  description: string | null;
};

export type SectionPageAlbum = AlbumCard & {
  videos?: VideoListItem[];
  photos?: PhotoListItem[];
};

export type SectionPageData = {
  section: SectionDetail;
  albums: SectionPageAlbum[];
};

export type HomePageData = {
  sections: SectionSummary[];
  heroVideo: {
    title: string;
    sectionSlug: string;
    albumSlug: string;
    videoUrl: string;
    posterUrl: string | null;
  } | null;
};

export async function listSections(): Promise<SectionSummary[]> {
  const sections = await prisma.section.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: {
      _count: {
        select: {
          albums: {
            where: {
              isPublished: true,
            },
          },
        },
      },
    },
  });

  return sections.map((section) => ({
    id: section.id,
    type: section.type,
    title: section.title,
    slug: section.slug,
    order: section.order,
    albumCount: section._count.albums,
  }));
}

export async function getSectionBySlug(slug: string): Promise<SectionDetail | null> {
  const section = await prisma.section.findUnique({
    where: { slug },
    include: {
      _count: {
        select: {
          albums: {
            where: {
              isPublished: true,
            },
          },
        },
      },
    },
  });

  if (!section) {
    return null;
  }

  return {
    id: section.id,
    type: section.type,
    title: section.title,
    slug: section.slug,
    order: section.order,
    albumCount: section._count.albums,
    description: section.type === SectionType.VIDEO
      ? "Moving image, directed with control over pace, framing, and atmosphere."
      : section.type === SectionType.PHOTO
        ? "Still image sequences curated for rhythm, contrast, and detail."
        : "A reusable section space prepared for future publishing flows.",
  };
}

export async function getSectionAlbums(slug: string): Promise<AlbumCard[]> {
  const albums = await prisma.album.findMany({
    where: {
      isPublished: true,
      section: {
        slug,
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
      videos: {
        where: {
          isPublished: true,
        },
        select: {
          id: true,
        },
      },
      mediaFiles: {
        where: {
          kind: "IMAGE",
          isPublished: true,
        },
        select: {
          id: true,
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
    itemCount: album.videos.length + album.mediaFiles.length,
    sectionSlug: album.section.slug,
  }));
}

export async function getSectionPageData(slug: string): Promise<SectionPageData | null> {
  const section = await getSectionBySlug(slug);

  if (!section) {
    return null;
  }

  const albums = await getSectionAlbums(slug);

  const albumsWithItems = await Promise.all(
    albums.map(async (album) => {
      if (section.type === SectionType.VIDEO) {
        return {
          ...album,
          videos: await getAlbumVideos(album.slug),
        };
      }

      if (section.type === SectionType.PHOTO) {
        return {
          ...album,
          photos: await getAlbumPhotos(album.slug),
        };
      }

      return album;
    }),
  );

  return {
    section,
    albums: albumsWithItems,
  };
}

export async function getHomePageData(): Promise<HomePageData> {
  const [sections, heroVideo] = await Promise.all([
    listSections(),
    prisma.video.findFirst({
      where: {
        isPublished: true,
        album: {
          isPublished: true,
          section: {
            type: SectionType.VIDEO,
          },
        },
      },
      orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { createdAt: "desc" }],
      select: {
        title: true,
        videoFile: {
          select: {
            publicUrl: true,
          },
        },
        thumbnail: {
          select: {
            publicUrl: true,
          },
        },
        album: {
          select: {
            slug: true,
            section: {
              select: {
                slug: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    sections,
    heroVideo: heroVideo
      ? {
          title: heroVideo.title,
          sectionSlug: heroVideo.album.section.slug,
          albumSlug: heroVideo.album.slug,
          videoUrl: heroVideo.videoFile.publicUrl,
          posterUrl: heroVideo.thumbnail?.publicUrl ?? null,
        }
      : null,
  };
}
