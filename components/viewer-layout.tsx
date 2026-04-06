"use client";

import { useEffect, useRef, useState } from "react";
import { AlbumMobileSlider } from "@/components/photo/album-mobile-slider";
import { SiteNavigation } from "@/components/site-navigation";
import type { PhotoListItem, VideoListItem } from "@/lib/services/albums";
import type { SectionPageAlbum, SectionPageData } from "@/lib/services/sections";

type ViewerLayoutProps = {
  page: SectionPageData;
  initialAlbumSlug?: string | null;
};

type ViewerMedia =
  | ({
      kind: "VIDEO";
      url: string;
      previewUrl: string;
    } & VideoListItem)
  | ({
      kind: "PHOTO";
      url: string;
      previewUrl: string;
    } & PhotoListItem);

type ViewerPhoto = Extract<ViewerMedia, { kind: "PHOTO" }>;

export function ViewerLayout({ page, initialAlbumSlug = null }: ViewerLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(
    page.albums.find((album) => album.slug === initialAlbumSlug)?.id ?? null,
  );
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(
    page.albums.find((album) => album.slug === initialAlbumSlug)?.id ?? page.albums[0]?.id ?? null,
  );
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const previewRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const touchStartX = useRef(0);

  const selectedAlbum = page.albums.find((album) => album.id === selectedAlbumId) ?? null;
  const activeAlbum = page.albums.find((album) => album.id === activeAlbumId) ?? page.albums[0] ?? null;
  const media = getAlbumMedia(selectedAlbum);
  const selectedMedia = media.find((item) => item.id === selectedMediaId) ?? null;
  const photoList = media.filter((item): item is ViewerPhoto => item.kind === "PHOTO");
  const currentIndex = photoList.findIndex((photo) => photo.id === selectedMediaId);
  const displayedPhoto = selectedMedia?.kind === "PHOTO" ? selectedMedia : null;
  const previewAlbum = selectedAlbum ?? page.albums[0] ?? null;
  const isAlbumOpen = Boolean(selectedAlbumId);
  const isGallerySidebar =
    (page.section.type === "PHOTO" || page.section.type === "VIDEO") && isAlbumOpen;

  useEffect(() => {
    function syncViewport() {
      setIsMobile(window.innerWidth < 768);
    }

    syncViewport();
    window.addEventListener("resize", syncViewport);

    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    if (!selectedAlbumId) {
      setSelectedMediaId(null);
      return;
    }

    if (page.section.type === "VIDEO" || page.section.type === "PHOTO") {
      const firstMedia = media[0] ?? null;
      setSelectedMediaId(firstMedia?.id ?? null);
      return;
    }

    setSelectedMediaId(null);
  }, [selectedAlbumId, page.section.type]);

  useEffect(() => {
    Object.entries(previewRefs.current).forEach(([id, element]) => {
      if (!element) {
        return;
      }

      if (hoveredVideoId === id) {
        void element.play().catch(() => undefined);
        return;
      }

      element.pause();
      element.currentTime = 0;
    });
  }, [hoveredVideoId]);

  useEffect(() => {
    if (!lightboxOpen) {
      document.body.style.overflow = "";
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxOpen]);

  useEffect(() => {
    if (!lightboxOpen) {
      return;
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLightboxOpen(false);
      }

      if (event.key === "ArrowRight") {
        goNext();
      }

      if (event.key === "ArrowLeft") {
        goPrev();
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxOpen, currentIndex, photoList]);

  function openAlbum(albumId: string) {
    setActiveAlbumId(albumId);
    setSelectedAlbumId(albumId);
  }

  function closeAlbum() {
    setSelectedAlbumId(null);
    setSelectedMediaId(null);
    setHoveredVideoId(null);
    setLightboxOpen(false);
  }

  function goNext() {
    if (photoList.length === 0 || currentIndex < 0) {
      return;
    }

    const nextIndex = (currentIndex + 1) % photoList.length;
    setSelectedMediaId(photoList[nextIndex].id);
  }

  function goPrev() {
    if (photoList.length === 0 || currentIndex < 0) {
      return;
    }

    const prevIndex = (currentIndex - 1 + photoList.length) % photoList.length;
    setSelectedMediaId(photoList[prevIndex].id);
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.touches[0].clientX;
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const diff = event.changedTouches[0].clientX - touchStartX.current;

    if (diff > 50) {
      goPrev();
    }

    if (diff < -50) {
      goNext();
    }
  }

  return (
    <main className="viewer-page">
      <SiteNavigation className="viewer-header" />

      {page.section.type === "PHOTO" && isMobile ? (
        <div className="photo-mobile-page">
          <AlbumMobileSlider albums={page.albums} />
        </div>
      ) : (
        <div className="viewer-layout">
          <aside
            className={`viewer-sidebar ${isGallerySidebar ? "photo-gallery-sidebar" : ""}`}
          >
          <div className="viewer-sidebar-head">
            {isAlbumOpen ? (
              <button type="button" className="sidebar-back back-label" onClick={closeAlbum}>
                ← Альбомы
              </button>
            ) : null}
          </div>

          {!isAlbumOpen ? (
            <div className="viewer-list">
              {page.albums.length > 0 ? (
                page.albums.map((album) => (
                  (() => {
                    const firstAlbumVideo = album.videos?.[0] ?? null;
                    const previewImage =
                      page.section.type === "VIDEO"
                        ? album.coverUrl ??
                          album.videos?.find((video) => video.thumbnailUrl)?.thumbnailUrl ??
                          album.videos?.[0]?.thumbnailUrl ??
                          null
                        : album.photos?.[0]?.thumbnailUrl ??
                          album.photos?.[0]?.imageUrl ??
                          "/img/photo.png";
                    const shouldRenderAlbumPreviewVideo =
                      page.section.type === "VIDEO" &&
                      !album.coverUrl &&
                      !album.videos?.find((video) => video.thumbnailUrl)?.thumbnailUrl &&
                      !album.videos?.[0]?.thumbnailUrl &&
                      Boolean(firstAlbumVideo?.videoUrl);

                    return (
                      <button
                        key={album.id}
                        type="button"
                        className={`viewer-album-card album-card ${
                          page.section.type === "PHOTO" || page.section.type === "VIDEO"
                            ? "viewer-album-card--photo"
                            : ""
                        }`}
                        onClick={() => openAlbum(album.id)}
                        onMouseEnter={() => setActiveAlbumId(album.id)}
                        onFocus={() => setActiveAlbumId(album.id)}
                      >
                        {page.section.type === "PHOTO" || page.section.type === "VIDEO" ? (
                          <>
                            <div className="album-preview">
                              {shouldRenderAlbumPreviewVideo && firstAlbumVideo ? (
                                <video
                                  src={firstAlbumVideo.videoUrl}
                                  autoPlay
                                  muted
                                  loop
                                  playsInline
                                  preload="metadata"
                                  aria-label={album.title}
                                />
                              ) : previewImage ? (
                                <img src={previewImage} alt={album.title} />
                              ) : (
                                <div className="album-preview-fallback" aria-hidden="true" />
                              )}
                            </div>
                            <div className="album-overlay">
                              <strong>{album.title}</strong>
                              <span>
                                {album.itemCount} {page.section.type === "VIDEO" ? "videos" : "photos"}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <strong>{album.title}</strong>
                            <span>{album.description ?? `${album.itemCount} материалов`}</span>
                          </>
                        )}
                      </button>
                    );
                  })()
                ))
              ) : (
                <div className="viewer-empty-block">В этом разделе пока нет альбомов.</div>
              )}
            </div>
          ) : (
            <div className={`viewer-list ${isGallerySidebar ? "photo-gallery-grid" : ""}`}>
              {media.length > 0 ? (
                media.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`media-item ${selectedMediaId === item.id ? "is-active" : ""}`}
                    onClick={() => setSelectedMediaId(item.id)}
                    onMouseEnter={() => {
                      if (item.kind === "VIDEO") {
                        setHoveredVideoId(item.id);
                      }
                    }}
                    onMouseLeave={() => {
                      if (item.kind === "VIDEO") {
                        setHoveredVideoId((current) => (current === item.id ? null : current));
                      }
                    }}
                  >
                    <div className="media-block-preview">
                      {item.kind === "VIDEO" ? (
                        <video
                          ref={(element) => {
                            previewRefs.current[item.id] = element;
                          }}
                          src={item.url}
                          poster={item.previewUrl}
                          muted
                          loop
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <img src={item.previewUrl} alt={item.title} />
                      )}
                    </div>
                    <div className="media-title">{item.title}</div>
                  </button>
                ))
              ) : (
                <div className="viewer-empty-block">В этом альбоме пока нет медиа.</div>
              )}
            </div>
          )}
          </aside>

          <section className="viewer-main">
            {page.section.type === "VIDEO" ? (
              <VideoContent media={selectedMedia?.kind === "VIDEO" ? selectedMedia : null} />
            ) : null}

            {page.section.type === "PHOTO" ? (
              selectedAlbum ? (
                <PhotoContent media={displayedPhoto} onOpenLightbox={() => setLightboxOpen(true)} />
              ) : (
                <AlbumDescriptionPanel album={activeAlbum} />
              )
            ) : null}

            {page.section.type === "BLOG" || page.section.type === "MUSIC" ? (
              <PlaceholderContent sectionTitle={page.section.title} album={previewAlbum} />
            ) : null}
          </section>
        </div>
      )}

      {lightboxOpen && displayedPhoto?.kind === "PHOTO" ? (
        <div
          className="lightbox"
          onClick={() => setLightboxOpen(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <button
            type="button"
            className="lightbox-close"
            onClick={(event) => {
              event.stopPropagation();
              setLightboxOpen(false);
            }}
            aria-label="Close fullscreen photo"
          >
            ✕
          </button>

          <button
            type="button"
            className="lightbox-nav left"
            onClick={(event) => {
              event.stopPropagation();
              goPrev();
            }}
            aria-label="Previous photo"
          >
            <span>‹</span>
          </button>

          <img
            key={displayedPhoto.id}
            src={displayedPhoto.url}
            alt={displayedPhoto.title}
            className="lightbox-image"
            onClick={(event) => event.stopPropagation()}
          />

          <button
            type="button"
            className="lightbox-nav right"
            onClick={(event) => {
              event.stopPropagation();
              goNext();
            }}
            aria-label="Next photo"
          >
            <span>›</span>
          </button>
        </div>
      ) : null}
    </main>
  );
}

function AlbumDescriptionPanel({
  album,
}: {
  album: SectionPageAlbum | null;
}) {
  if (!album) {
    return null;
  }

  return (
    <div className="placeholder-panel album-description-panel">
      <p className="editorial-kicker">Photo</p>
      <h2>{album.title}</h2>
      <p className={album.description ? undefined : "muted"}>
        {album.description ?? "Описание скоро появится"}
      </p>
    </div>
  );
}

function VideoContent({
  media,
}: {
  media: (VideoListItem & { kind: "VIDEO"; url: string; previewUrl: string }) | null;
}) {
  return (
    <>
      {media?.url ? (
        <div className="viewer-stage">
          <video
            key={media.id}
            src={media.url}
            poster={media.previewUrl}
            controls
            autoPlay
            muted
            loop
            playsInline
            className="viewer-video"
          />
        </div>
      ) : (
        <div className="placeholder-panel viewer-placeholder-panel">
          <h3>Видео пока не выбрано</h3>
          <p>Откройте альбом слева. Если в альбоме есть видео, случайный ролик загрузится автоматически.</p>
        </div>
      )}
    </>
  );
}

function PhotoContent({
  media,
  onOpenLightbox,
}: {
  media: (PhotoListItem & { kind: "PHOTO"; url: string; previewUrl: string }) | null;
  onOpenLightbox: () => void;
}) {
  return (
    <>
      {media ? (
        <button type="button" className="viewer-image-button" onClick={onOpenLightbox}>
          <img key={media.id} src={media.url} alt={media.title} className="viewer-image" />
        </button>
      ) : (
        <div className="placeholder-panel viewer-empty">
          <h3>Фото пока не выбрано</h3>
          <p>Откройте альбом слева.</p>
        </div>
      )}
    </>
  );
}

function PlaceholderContent({
  sectionTitle,
  album,
}: {
  sectionTitle: string;
  album: SectionPageAlbum | null;
}) {
  return (
    <div className="placeholder-panel">
      <p className="editorial-kicker">{sectionTitle}</p>
      <h2>{album?.title ?? `${sectionTitle} в разработке`}</h2>
      <p>
        Для раздела {sectionTitle.toLowerCase()} сохранён тот же editorial layout: слева альбомы, справа контент.
      </p>
    </div>
  );
}

function getAlbumMedia(album: SectionPageAlbum | null): ViewerMedia[] {
  if (!album) {
    return [];
  }

  if (album.videos) {
    return album.videos.map((video) => ({
      ...video,
      kind: "VIDEO" as const,
      url: video.videoUrl,
      previewUrl: video.thumbnailUrl ?? video.videoUrl,
    }));
  }

  if (album.photos) {
    return album.photos.map((photo) => ({
      ...photo,
      kind: "PHOTO" as const,
      url: photo.imageUrl,
      previewUrl: photo.thumbnailUrl ?? photo.imageUrl,
    }));
  }

  return [];
}
