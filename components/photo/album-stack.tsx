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
  const previewPhotos = album.photos?.slice(0, 2) ?? [];
  const previewImages = previewPhotos
    .map((photo) => photo.thumbnailUrl ?? photo.imageUrl)
    .filter(Boolean);

  const topImage = previewImages[0] ?? "/img/photo.png";
  const backImage = previewImages[1] ?? topImage;
  const topPhoto = previewPhotos[0] ?? { id: album.id, title: null };

  return (
    <button
      type="button"
      className={`album-stack ${isActive ? "is-active" : ""}`}
      onClick={onClick}
      onMouseEnter={onHover}
      onFocus={onHover}
    >
      <div className="album-stack-layer layer-back">
        <div className="polaroid polaroid--stack-back">
          <div className="polaroid-media polaroid-media--stack">
            <img className="polaroid-image polaroid-image--stack" src={backImage} alt="" aria-hidden="true" />
          </div>
        </div>
      </div>
      <div className="album-stack-layer layer-front">
        <div className="polaroid polaroid--stack-front">
          <div className="polaroid-media polaroid-media--stack">
            <img className="polaroid-image polaroid-image--stack" src={topImage} alt={getPhotoCaption(topPhoto)} />
          </div>
          <div className="polaroid-caption">{getPhotoCaption(topPhoto)}</div>
        </div>
      </div>
    </button>
  );
}
