ALTER TABLE "Section"
ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Album"
ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "MediaFile"
ADD COLUMN "title" TEXT,
ADD COLUMN "slug" TEXT,
ADD COLUMN "albumId" UUID,
ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Video"
ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "MediaFile_slug_key" ON "MediaFile"("slug");
CREATE INDEX "Album_isPublished_order_createdAt_idx" ON "Album"("isPublished", "order", "createdAt");
CREATE INDEX "MediaFile_albumId_kind_isPublished_order_createdAt_idx" ON "MediaFile"("albumId", "kind", "isPublished", "order", "createdAt");
CREATE INDEX "Video_order_createdAt_idx" ON "Video"("order", "createdAt");

ALTER TABLE "MediaFile"
ADD CONSTRAINT "MediaFile_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE SET NULL ON UPDATE CASCADE;
