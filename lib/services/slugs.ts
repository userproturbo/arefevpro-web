import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const MAX_SLUG_ATTEMPTS = 10;

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export async function generateUniqueAlbumSlug(title: string): Promise<string> {
  return generateUniqueSlug({
    baseSlug: slugify(title) || "album",
    exists: async (candidate) =>
      Boolean(
        await prisma.album.findUnique({
          where: { slug: candidate },
          select: { id: true },
        }),
      ),
  });
}

export async function generateUniqueMediaSlug(title: string): Promise<string> {
  return generateUniqueSlug({
    baseSlug: slugify(title) || "media",
    exists: async (candidate) =>
      Boolean(
        await prisma.mediaFile.findUnique({
          where: { slug: candidate },
          select: { id: true },
        }),
      ),
  });
}

export async function generateUniqueVideoSlugInTransaction(
  tx: Prisma.TransactionClient,
  title: string,
): Promise<string> {
  return generateUniqueSlug({
    baseSlug: slugify(title) || "video",
    exists: async (candidate) =>
      Boolean(
        await tx.video.findUnique({
          where: { slug: candidate },
          select: { id: true },
        }),
      ),
  });
}

async function generateUniqueSlug(input: {
  baseSlug: string;
  exists: (candidate: string) => Promise<boolean>;
}): Promise<string> {
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
    const candidate =
      attempt === 0 ? input.baseSlug : `${input.baseSlug}-${attempt + 1}`;

    if (!(await input.exists(candidate))) {
      return candidate;
    }
  }

  const randomCandidate = `${input.baseSlug}-${Math.random().toString(36).slice(2, 8)}`;

  if (!(await input.exists(randomCandidate))) {
    return randomCandidate;
  }

  throw new Error(`Failed to generate unique slug for ${input.baseSlug}`);
}
