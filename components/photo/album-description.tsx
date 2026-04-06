"use client";

import type { SectionPageAlbum } from "@/lib/services/sections";

type AlbumDescriptionProps = {
  album: SectionPageAlbum | null;
};

export function AlbumDescription({ album }: AlbumDescriptionProps) {
  if (!album) {
    return null;
  }

  return (
    <div className="album-description-block">
      <h2>{album.title}</h2>
      <p className={album.description ? undefined : "muted"}>
        {album.description ?? "Описание скоро появится"}
      </p>
    </div>
  );
}
