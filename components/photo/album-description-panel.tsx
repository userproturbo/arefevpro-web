import type { SectionPageAlbum } from "@/lib/services/sections";

type AlbumDescriptionPanelProps = {
  album: SectionPageAlbum | null;
};

export function AlbumDescriptionPanel({ album }: AlbumDescriptionPanelProps) {
  return (
    <div className="album-description-panel">
      <div key={album?.id ?? "empty"} className="album-description-panel-content">
        <p className="album-description-kicker">Photo Album</p>
        <h1>{album?.title ?? "Photo album coming soon"}</h1>
        <p>{album?.description ?? "Description coming soon."}</p>
        <div className="album-description-meta">
          <span>{album?.itemCount ?? 0} photos</span>
          <span>{album ? "Hover to preview, click again to open." : "New work will appear here."}</span>
        </div>
      </div>
    </div>
  );
}
