import type { CSSProperties } from "react";
import type { SectionPageAlbum } from "@/lib/services/sections";

type PhotoCaptionSource = {
  id: string;
  title?: string | null;
  fileName?: string | null;
  originalName?: string | null;
};

type AlbumStackProps = {
  album: SectionPageAlbum;
  isActive?: boolean;
  onClick: () => void;
  onHover?: () => void;
};

export function getPhotoCaption(photo: PhotoCaptionSource) {
  return (
    photo.title?.trim() ||
    photo.fileName?.trim() ||
    photo.originalName?.trim() ||
    `IMG_${photo.id}`
  );
}

export function AlbumStack({ album, isActive = false, onClick, onHover }: AlbumStackProps) {
  const previewPhotos = album.photos?.slice(0, 3) ?? [];
  const previewImages = previewPhotos
    .map((photo) => photo.thumbnailUrl ?? photo.imageUrl)
    .filter(Boolean);
  const stackImages = Array.from({ length: Math.max(Math.min(previewImages.length, 3), 3) }, (_, index) => {
    return previewImages[index] ?? previewImages[0] ?? "/img/photo.png";
  });

  return (
    <button
      type="button"
      className={`album-stack ${isActive ? "is-active" : ""}`}
      onClick={onClick}
      onMouseEnter={onHover}
      onFocus={onHover}
    >
      <div className="album-stack-visual" aria-hidden="true">
        {stackImages.map((image, index) => (
          <div
            key={`${album.id}-${index}`}
            className={`album-stack-layer album-stack-layer--${index + 1}`}
            style={{ ["--stack-index" as string]: index } as CSSProperties}
          >
            <div className="album-stack-frame">
              <img
                className="album-stack-image"
                src={image}
                alt=""
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
              />
            </div>
          </div>
        ))}
      </div>

    </button>
  );
}
