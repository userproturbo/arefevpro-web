import type { SectionPageAlbum } from "@/lib/services/sections";

type AlbumDescriptionProps = {
  album: SectionPageAlbum | null;
};

export function AlbumDescription({ album }: AlbumDescriptionProps) {
  if (!album) {
    return null;
  }

  return (
    <div className="album-description">
      <h2>{album.title}</h2>
      {album.description ? <p>{album.description}</p> : null}
    </div>
  );
}
