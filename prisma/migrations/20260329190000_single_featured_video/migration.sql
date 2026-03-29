CREATE UNIQUE INDEX "Video_single_featured_idx"
ON "Video" ("isFeatured")
WHERE "isFeatured" = true;
