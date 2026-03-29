import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

const sectionSeeds = [
  { type: "VIDEO", title: "Video", slug: "video", order: 1 },
  { type: "PHOTO", title: "Photo", slug: "photo", order: 2 },
  { type: "BLOG", title: "Blog", slug: "blog", order: 3 },
  { type: "MUSIC", title: "Music", slug: "music", order: 4 },
];

const showreelVideoUrl =
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4";
const showreelPosterUrl =
  "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1600&q=80";
const backstageImages = [
  {
    title: "Light Check",
    slug: "light-check",
    storageKey: "media/photos/demo-backstage/original/light-check.jpg",
    publicUrl:
      "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1600&q=80",
    order: 1,
    width: 1600,
    height: 2000,
  },
  {
    title: "Monitor Glow",
    slug: "monitor-glow",
    storageKey: "media/photos/demo-backstage/original/monitor-glow.jpg",
    publicUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
    order: 2,
    width: 1600,
    height: 2000,
  },
  {
    title: "Rig Detail",
    slug: "rig-detail",
    storageKey: "media/photos/demo-backstage/original/rig-detail.jpg",
    publicUrl:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80",
    order: 3,
    width: 1600,
    height: 2000,
  },
];

async function main() {
  const sections = await seedSections();
  const showreelAlbum = await seedShowreelAlbum(sections.video.id);
  const backstageAlbum = await seedBackstageAlbum(sections.photo.id);

  const posterFile = await seedShowreelPoster();
  const videoSourceFile = await seedDemoVideoSource();

  await seedDemoVideo({
    albumId: showreelAlbum.id,
    videoFileId: videoSourceFile.id,
    thumbnailId: posterFile.id,
  });

  const photoFiles = await seedBackstagePhotos(backstageAlbum.id);

  await prisma.album.update({
    where: { id: showreelAlbum.id },
    data: {
      coverId: posterFile.id,
    },
  });

  await prisma.album.update({
    where: { id: backstageAlbum.id },
    data: {
      coverId: photoFiles[0]?.id ?? null,
    },
  });

  console.log("Seed complete");
  console.log(`Albums: ${showreelAlbum.slug}, ${backstageAlbum.slug}`);
}

async function seedSections() {
  const seededSections = {};

  for (const section of sectionSeeds) {
    const result = await prisma.section.upsert({
      where: { type: section.type },
      update: {
        title: section.title,
        slug: section.slug,
        order: section.order,
      },
      create: section,
    });

    if (section.type === "VIDEO") {
      seededSections.video = result;
    }

    if (section.type === "PHOTO") {
      seededSections.photo = result;
    }
  }

  return seededSections;
}

async function seedShowreelAlbum(sectionId) {
  return prisma.album.upsert({
    where: { slug: "showreel" },
    update: {
      title: "Showreel",
      description: "Selected cinematic works",
      sectionId,
      isPublished: true,
      order: 1,
    },
    create: {
      title: "Showreel",
      slug: "showreel",
      description: "Selected cinematic works",
      sectionId,
      isPublished: true,
      order: 1,
    },
  });
}

async function seedBackstageAlbum(sectionId) {
  return prisma.album.upsert({
    where: { slug: "backstage" },
    update: {
      title: "Backstage",
      description: "Behind the scenes",
      sectionId,
      isPublished: true,
      order: 1,
    },
    create: {
      title: "Backstage",
      slug: "backstage",
      description: "Behind the scenes",
      sectionId,
      isPublished: true,
      order: 1,
    },
  });
}

async function seedShowreelPoster() {
  return prisma.mediaFile.upsert({
    where: {
      storageKey: "media/videos/demo-reel/thumbnails/poster.jpg",
    },
    update: {
      title: "Demo Reel Poster",
      slug: "demo-reel-poster",
      publicUrl: showreelPosterUrl,
      mimeType: "image/jpeg",
      width: 1600,
      height: 1067,
      isPublished: false,
      order: 0,
      albumId: null,
    },
    create: {
      title: "Demo Reel Poster",
      slug: "demo-reel-poster",
      kind: "IMAGE",
      storageKey: "media/videos/demo-reel/thumbnails/poster.jpg",
      publicUrl: showreelPosterUrl,
      mimeType: "image/jpeg",
      width: 1600,
      height: 1067,
      isPublished: false,
      order: 0,
      albumId: null,
    },
  });
}

async function seedDemoVideoSource() {
  return prisma.mediaFile.upsert({
    where: {
      storageKey: "media/videos/demo-reel/original/source.mp4",
    },
    update: {
      kind: "VIDEO",
      publicUrl: showreelVideoUrl,
      mimeType: "video/mp4",
      sizeBytes: 104857600,
      durationSec: 92,
      width: 1920,
      height: 1080,
      isPublished: false,
      order: 0,
      title: null,
      slug: null,
      albumId: null,
    },
    create: {
      kind: "VIDEO",
      storageKey: "media/videos/demo-reel/original/source.mp4",
      publicUrl: showreelVideoUrl,
      mimeType: "video/mp4",
      sizeBytes: 104857600,
      durationSec: 92,
      width: 1920,
      height: 1080,
      isPublished: false,
      order: 0,
      title: null,
      slug: null,
      albumId: null,
    },
  });
}

async function seedDemoVideo({ albumId, videoFileId, thumbnailId }) {
  return prisma.video.upsert({
    where: { slug: "demo-reel" },
    update: {
      title: "Demo Reel",
      description: "A public sample reel used to populate the cinematic portfolio UI.",
      albumId,
      videoFileId,
      thumbnailId,
      isPublished: true,
      isFeatured: true,
      order: 1,
    },
    create: {
      title: "Demo Reel",
      slug: "demo-reel",
      description: "A public sample reel used to populate the cinematic portfolio UI.",
      albumId,
      videoFileId,
      thumbnailId,
      isPublished: true,
      isFeatured: true,
      order: 1,
    },
  });
}

async function seedBackstagePhotos(albumId) {
  const files = [];

  for (const image of backstageImages) {
    const file = await prisma.mediaFile.upsert({
      where: {
        storageKey: image.storageKey,
      },
      update: {
        title: image.title,
        slug: image.slug,
        kind: "IMAGE",
        publicUrl: image.publicUrl,
        mimeType: "image/jpeg",
        width: image.width,
        height: image.height,
        albumId,
        isPublished: true,
        order: image.order,
      },
      create: {
        title: image.title,
        slug: image.slug,
        kind: "IMAGE",
        storageKey: image.storageKey,
        publicUrl: image.publicUrl,
        mimeType: "image/jpeg",
        width: image.width,
        height: image.height,
        albumId,
        isPublished: true,
        order: image.order,
      },
    });

    files.push(file);
  }

  return files;
}

main()
  .catch((error) => {
    console.error("Seed error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
