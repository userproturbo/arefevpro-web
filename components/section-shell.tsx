"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { PhotoListItem, VideoListItem } from "@/lib/services/albums";
import type { SectionPageAlbum, SectionPageData, SectionSummary } from "@/lib/services/sections";

type SectionShellProps = {
  page: SectionPageData;
  sections: SectionSummary[];
};

type SectionMediaItem =
  | ({ kind: "VIDEO" } & VideoListItem)
  | ({ kind: "PHOTO" } & PhotoListItem);

export function SectionShell({ page, sections }: SectionShellProps) {
  const initialAlbum = page.albums[0] ?? null;
  const [activeAlbumSlug, setActiveAlbumSlug] = useState<string | null>(initialAlbum?.slug ?? null);
  const [activeMediaId, setActiveMediaId] = useState<string | null>(
    getAlbumItems(initialAlbum)[0]?.id ?? null,
  );
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);

  const activeAlbum = useMemo(
    () => page.albums.find((album) => album.slug === activeAlbumSlug) ?? initialAlbum,
    [activeAlbumSlug, initialAlbum, page.albums],
  );

  const mediaItems = getAlbumItems(activeAlbum);
  const activeMedia =
    mediaItems.find((item) => item.id === activeMediaId) ?? mediaItems[0] ?? null;

  function handleAlbumChange(album: SectionPageAlbum) {
    setActiveAlbumSlug(album.slug);
    setActiveMediaId(getAlbumItems(album)[0]?.id ?? null);
    setLightboxOpen(false);
  }

  async function handleVideoFullscreen() {
    if (!videoContainerRef.current) {
      return;
    }

    await videoContainerRef.current.requestFullscreen();
  }

  return (
    <>
      <main className="section-shell">
        <aside className="section-sidebar">
          <div className="sidebar-top">
            <nav className="section-nav" aria-label="Primary sections">
              <Link href="/" className="nav-badge nav-badge-home">
                HM
              </Link>
              {sections.map((section) => (
                <Link
                  key={section.id}
                  href={`/${section.slug}`}
                  className={`nav-badge ${section.slug === page.section.slug ? "is-active" : ""}`}
                >
                  {section.slug.slice(0, 2).toUpperCase()}
                </Link>
              ))}
            </nav>

            <div className="section-heading">
              <p className="eyebrow">Section</p>
              <h1>{page.section.title}</h1>
              <p>{page.section.description}</p>
            </div>
          </div>

          <div className="album-list">
            {page.albums.map((album) => (
              <button
                key={album.id}
                type="button"
                className={`album-card ${album.slug === activeAlbum?.slug ? "is-active" : ""}`}
                onClick={() => handleAlbumChange(album)}
              >
                <div className="album-card-image">
                  {album.coverUrl ? (
                    <img src={album.coverUrl} alt={album.title} />
                  ) : (
                    <div className="album-card-fallback">{album.title.slice(0, 2).toUpperCase()}</div>
                  )}
                </div>
                <div className="album-card-copy">
                  <span>{album.title}</span>
                  <small>{album.itemCount} items</small>
                </div>
              </button>
            ))}
          </div>

          <div className="media-list">
            <div className="media-list-header">
              <span>{activeAlbum?.title ?? "No Album Selected"}</span>
              <small>{mediaItems.length} entries</small>
            </div>

            {mediaItems.length === 0 ? (
              <div className="media-empty">No published media in this album yet.</div>
            ) : (
              mediaItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`media-row ${item.id === activeMedia?.id ? "is-active" : ""}`}
                  onClick={() => setActiveMediaId(item.id)}
                >
                  <div className="media-row-thumb">
                    {"thumbnailUrl" in item && item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt={item.title} />
                    ) : item.kind === "PHOTO" ? (
                      <img src={item.imageUrl} alt={item.title} />
                    ) : (
                      <div className="media-card-fallback">{item.kind}</div>
                    )}
                  </div>
                  <div className="media-row-copy">
                    <span>{item.title}</span>
                    <small>{item.kind === "VIDEO" ? formatDuration(item.durationSec) : "Photo"}</small>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="section-viewer">
          {activeMedia ? (
            activeMedia.kind === "VIDEO" ? (
              <div className="viewer-panel" ref={videoContainerRef}>
                <div className="viewer-meta">
                  <div>
                    <p className="eyebrow">Active Video</p>
                    <h2>{activeMedia.title}</h2>
                    <p>{activeMedia.description ?? "Published video playback in the active album."}</p>
                  </div>
                  <button type="button" className="viewer-action" onClick={handleVideoFullscreen}>
                    Fullscreen
                  </button>
                </div>

                <video
                  key={activeMedia.id}
                  className="viewer-video"
                  src={activeMedia.videoUrl}
                  poster={activeMedia.thumbnailUrl ?? undefined}
                  controls
                  playsInline
                />
              </div>
            ) : (
              <div className="viewer-panel">
                <div className="viewer-meta">
                  <div>
                    <p className="eyebrow">Active Image</p>
                    <h2>{activeMedia.title}</h2>
                    <p>Published still image presented in a desktop-first lightbox viewer.</p>
                  </div>
                  <button
                    type="button"
                    className="viewer-action"
                    onClick={() => setLightboxOpen(true)}
                  >
                    Open Lightbox
                  </button>
                </div>

                <button
                  type="button"
                  className="photo-stage"
                  onClick={() => setLightboxOpen(true)}
                >
                  <img src={activeMedia.imageUrl} alt={activeMedia.title} className="viewer-image" />
                </button>
              </div>
            )
          ) : (
            <div className="viewer-empty">
              <p className="eyebrow">Viewer</p>
              <h2>No published media</h2>
              <p>This section is ready for content. Publish albums and media to populate the viewer.</p>
            </div>
          )}
        </section>
      </main>

      {lightboxOpen && activeMedia?.kind === "PHOTO" ? (
        <div className="lightbox" role="dialog" aria-modal="true">
          <button type="button" className="lightbox-close" onClick={() => setLightboxOpen(false)}>
            Close
          </button>
          <img src={activeMedia.imageUrl} alt={activeMedia.title} className="lightbox-image" />
        </div>
      ) : null}
    </>
  );
}

function getAlbumItems(album: SectionPageAlbum | null): SectionMediaItem[] {
  if (!album) {
    return [];
  }

  if (album.videos) {
    return album.videos.map((video) => ({
      ...video,
      kind: "VIDEO" as const,
    }));
  }

  if (album.photos) {
    return album.photos.map((photo) => ({
      ...photo,
      kind: "PHOTO" as const,
    }));
  }

  return [];
}

function formatDuration(durationSec: number | null): string {
  if (!durationSec) {
    return "Video";
  }

  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
