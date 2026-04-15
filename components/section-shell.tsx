"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PhotoListItem, VideoListItem } from "@/lib/services/albums";
import type { SectionPageAlbum, SectionPageData } from "@/lib/services/sections";

type SectionShellProps = {
  page: SectionPageData;
};

type SectionMediaItem =
  | ({
      kind: "VIDEO";
      url: string;
      thumbnail: string | null;
    } & VideoListItem)
  | ({
      kind: "PHOTO";
      url: string;
      thumbnail: string | null;
    } & PhotoListItem);

export function SectionShell({ page }: SectionShellProps) {
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(page.albums[0]?.id ?? null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const selectedAlbum = useMemo(
    () => page.albums.find((album) => album.id === selectedAlbumId) ?? page.albums[0] ?? null,
    [page.albums, selectedAlbumId],
  );

  const media = useMemo(() => getAlbumMedia(selectedAlbum), [selectedAlbum]);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(media[0]?.id ?? null);

  useEffect(() => {
    setSelectedMediaId(media[0]?.id ?? null);
    setLightboxOpen(false);
  }, [selectedAlbumId, media]);

  useEffect(() => {
    if (!selectedMediaId && media.length > 0) {
      setSelectedMediaId(media[0].id);
    }
  }, [media, selectedMediaId]);

  const selectedMedia = media.find((item) => item.id === selectedMediaId) ?? media[0] ?? null;
  const headingTitle = selectedAlbum?.title ?? page.section.title;
  const description = selectedMedia?.title ?? selectedAlbum?.description ?? page.section.description ?? page.section.title;

  return (
    <>
      <div className="viewer-root">
        <div className="viewer-media-stage">
          {selectedMedia ? (
            selectedMedia.kind === "VIDEO" ? (
              <video
                key={selectedMedia.id}
                src={selectedMedia.url}
                autoPlay
                muted
                loop
                playsInline
                controls
                poster={selectedMedia.thumbnail ?? undefined}
                className="viewer-media viewer-media-motion"
              />
            ) : (
              <button
                type="button"
                className="viewer-image-button"
                onClick={() => setLightboxOpen(true)}
                aria-label={`Open ${selectedMedia.title}`}
              >
                <img
                  key={selectedMedia.id}
                  src={selectedMedia.url}
                  alt={selectedMedia.title}
                  className="viewer-media viewer-media-motion"
                />
              </button>
            )
          ) : (
            <div className="viewer-empty-state">
              <p>No published media in this album yet.</p>
            </div>
          )}
        </div>

        <div className="viewer-overlay-dark" aria-hidden="true" />
        <div className="viewer-overlay-vignette" aria-hidden="true" />

        <div className="viewer-content">
          <div className="viewer-content-inner">
            <Link href="/" className="viewer-kicker">
              AREFEVPRO
            </Link>
            <h1>{headingTitle}</h1>
            <p>{description}</p>
          </div>
        </div>

        <aside className="viewer-sidebar">
          <div className="viewer-sidebar-scroll">
            <div className="viewer-sidebar-block">
              <span className="viewer-sidebar-label">{page.section.title}</span>
              <div className="albums">
                {page.albums.map((album) => (
                  <button
                    key={album.id}
                    type="button"
                    className={`album ${selectedAlbumId === album.id ? "active" : ""}`}
                    onClick={() => setSelectedAlbumId(album.id)}
                  >
                    <span>{album.title}</span>
                    <small>{album.itemCount} items</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="viewer-sidebar-block">
              <div className="viewer-sidebar-copy">
                <span className="viewer-sidebar-label">Media</span>
                <p>{selectedAlbum?.description ?? page.section.description ?? "Curated in fullscreen."}</p>
              </div>

              <div className="media-list">
                {media.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`media-item ${selectedMediaId === item.id ? "active" : ""}`}
                    onClick={() => setSelectedMediaId(item.id)}
                  >
                    <img src={item.thumbnail || item.url} alt={item.title} />
                    <span className="media-item-copy">
                      <strong>{item.title}</strong>
                      <small>
                        {String(index + 1).padStart(2, "0")} / {item.kind === "VIDEO" ? "Video" : "Photo"}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {lightboxOpen && selectedMedia?.kind === "PHOTO" ? (
        <div className="lightbox" onClick={() => setLightboxOpen(false)} role="presentation">
          <button
            type="button"
            className="lightbox-close"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close image"
          >
            Close
          </button>
          <img
            src={selectedMedia.url}
            alt={selectedMedia.title}
            className="lightbox-image"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}

function getAlbumMedia(album: SectionPageAlbum | null): SectionMediaItem[] {
  if (!album) {
    return [];
  }

  if (album.videos) {
    return album.videos.map((video) => ({
      ...video,
      kind: "VIDEO" as const,
      url: video.videoUrl,
      thumbnail: video.thumbnailUrl,
    }));
  }

  if (album.photos) {
    return album.photos.map((photo) => ({
      ...photo,
      kind: "PHOTO" as const,
      url: photo.imageUrl,
      thumbnail: photo.thumbnailUrl,
    }));
  }

  return [];
}
