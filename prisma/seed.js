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

async function main() {
  await prisma.section.upsert({
    where: { type: "VIDEO" },
    update: {},
    create: {
      type: "VIDEO",
      title: "Video",
      slug: "video",
      order: 1,
    },
  });

  await prisma.section.upsert({
    where: { type: "PHOTO" },
    update: {},
    create: {
      type: "PHOTO",
      title: "Photo",
      slug: "photo",
      order: 2,
    },
  });

  await prisma.section.upsert({
    where: { type: "BLOG" },
    update: {},
    create: {
      type: "BLOG",
      title: "Blog",
      slug: "blog",
      order: 3,
    },
  });

  await prisma.section.upsert({
    where: { type: "MUSIC" },
    update: {},
    create: {
      type: "MUSIC",
      title: "Music",
      slug: "music",
      order: 4,
    },
  });

  console.log("✅ Seed done");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });