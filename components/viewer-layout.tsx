"use client";

import { useEffect, useRef, useState } from "react";
import { AlbumMobileSlider } from "@/components/photo/album-mobile-slider";
import { AlbumDescriptionPanel } from "@/components/photo/album-description-panel";
import { AlbumStack, getPhotoCaption } from "@/components/photo/album-stack";
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
  const isImmersiveViewer = page.section.type === "PHOTO" || page.section.type === "VIDEO";
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
  const isPhotoSection = page.section.type === "PHOTO";
  const isGallerySidebar =
    (isPhotoSection || page.section.type === "VIDEO") && isAlbumOpen;
  const previewVisual = getAlbumStageVisual(page.section.type, activeAlbum);
  const shouldRenderPhotoBrowser = isPhotoSection && !isAlbumOpen;
  const shouldRenderPhotoMobileGallery = isPhotoSection && isMobile && isAlbumOpen;

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
    if (!isImmersiveViewer) {
      return;
    }

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [isImmersiveViewer]);

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
    <main
      className={`viewer-page ${isImmersiveViewer ? "viewer-page--immersive" : ""} ${
        isPhotoSection ? "photo-page" : ""
      } ${page.section.type === "VIDEO" ? "video-page" : ""}`}
    >
      <SiteNavigation className="viewer-header" />

      {shouldRenderPhotoMobileGallery ? (
        <div className="photo-mobile-page">
          <AlbumMobileSlider albums={page.albums} />
        </div>
      ) : shouldRenderPhotoBrowser ? (
        <div className="photo-browser">
          <aside className="photo-album-stacks">
            {page.albums.length > 0 ? (
              page.albums.map((album) => (
                <AlbumStack
                  key={album.id}
                  album={album}
                  isActive={activeAlbum?.id === album.id}
                  onClick={() => openAlbum(album.id)}
                  onHover={isMobile ? undefined : () => setActiveAlbumId(album.id)}
                />
              ))
            ) : (
              <div className="viewer-empty-block">В этом разделе пока нет альбомов.</div>
            )}
          </aside>

          <section className="photo-album-description">
            <AlbumDescriptionPanel album={activeAlbum} />
          </section>
        </div>
      ) : (
        <div className={`viewer-shell ${isImmersiveViewer ? "viewer-shell--immersive" : ""}`}>
          <aside
            className={`viewer-rail ${isGallerySidebar ? "viewer-rail--gallery" : ""} ${
              isImmersiveViewer ? "viewer-rail--immersive" : ""
            } ${isPhotoSection && isAlbumOpen ? "photo-open-sidebar" : ""}`}
          >
            <div className="viewer-rail-head">
              {isAlbumOpen ? (
                <button type="button" className="sidebar-back back-label" onClick={closeAlbum}>
                  ← Альбомы
                </button>
              ) : (
                <div className="viewer-rail-copy">
                  <span className="album-stage-kicker">{page.section.title}</span>
                  <strong>{page.albums.length} альбомов</strong>
                </div>
              )}
            </div>

            {!isAlbumOpen ? (
              <div className="viewer-list viewer-list--albums">
                {page.albums.length > 0 ? (
                  page.albums.map((album) => {
                    const cardPreview = getAlbumCardPreview(page.section.type, album);
                    const isActiveAlbum = activeAlbum?.id === album.id;

                    return (
                      <button
                        key={album.id}
                        type="button"
                        className={`viewer-album-card album-card viewer-album-card--photo ${
                          isActiveAlbum ? "active" : ""
                        }`}
                        onClick={() => openAlbum(album.id)}
                        onMouseEnter={() => setActiveAlbumId(album.id)}
                        onFocus={() => setActiveAlbumId(album.id)}
                      >
                        <div className="album-preview">
                          {cardPreview.kind === "video" ? (
                            <video
                              src={cardPreview.src}
                              autoPlay
                              muted
                              loop
                              playsInline
                              preload="metadata"
                              aria-label={album.title}
                            />
                          ) : cardPreview.src ? (
                            <img src={cardPreview.src} alt={album.title} />
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
                      </button>
                    );
                  })
                ) : (
                  <div className="viewer-empty-block">В этом разделе пока нет альбомов.</div>
                )}
              </div>
            ) : isPhotoSection ? (
              <div className="viewer-list photo-open-list">
                {media.length > 0 ? (
                  media.map((item) =>
                    item.kind === "PHOTO" ? (
                      <button
                        key={item.id}
                        type="button"
                        className={`photo-thumb-card ${selectedMediaId === item.id ? "is-active" : ""}`}
                        onClick={() => setSelectedMediaId(item.id)}
                      >
                        <div className="polaroid">
                          <div className="polaroid-media polaroid-media--thumb photo-thumb-image">
                            <img
                              className="polaroid-image polaroid-image--thumb"
                              src={item.previewUrl}
                              alt={getPhotoCaption(item)}
                            />
                          </div>
                          <div className="polaroid-caption">{getPhotoCaption(item)}</div>
                        </div>
                      </button>
                    ) : null,
                  )
                ) : (
                  <div className="viewer-empty-block">В этом альбоме пока нет медиа.</div>
                )}
              </div>
            ) : (
              <div className="viewer-list photo-gallery-grid">
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

          <section
            className={`viewer-stage-panel ${isImmersiveViewer ? "viewer-stage-panel--immersive" : ""} ${
              isPhotoSection && isAlbumOpen ? "photo-stage-panel" : ""
            }`}
          >
            {page.section.type === "VIDEO" ? (
              <VideoContent
                album={activeAlbum}
                isAlbumOpen={isAlbumOpen}
                media={selectedMedia?.kind === "VIDEO" ? selectedMedia : null}
                previewVisual={previewVisual}
              />
            ) : null}

            {page.section.type === "PHOTO" ? (
              <PhotoContent
                album={activeAlbum}
                isAlbumOpen={isAlbumOpen}
                media={displayedPhoto}
                previewVisual={previewVisual}
                onOpenLightbox={() => setLightboxOpen(true)}
              />
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

function VideoContent({
  album,
  isAlbumOpen,
  media,
  previewVisual,
}: {
  album: SectionPageAlbum | null;
  isAlbumOpen: boolean;
  media: (VideoListItem & { kind: "VIDEO"; url: string; previewUrl: string }) | null;
  previewVisual: StageVisual;
}) {
  if (!isAlbumOpen) {
    return (
      <AlbumStage
        sectionLabel="Video album"
        album={album}
        visual={previewVisual}
        emptyMessage="Выберите альбом слева, чтобы открыть видеосцену."
      />
    );
  }

  return (
    <div className="viewer-stage viewer-stage--media">
      {media?.url ? (
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
      ) : (
        <div className="album-stage-empty">
          <p className="album-stage-kicker">Video album</p>
          <h2>В этом альбоме пока нет опубликованных видео.</h2>
        </div>
      )}
    </div>
  );
}

function PhotoContent({
  album,
  isAlbumOpen,
  media,
  previewVisual,
  onOpenLightbox,
}: {
  album: SectionPageAlbum | null;
  isAlbumOpen: boolean;
  media: (PhotoListItem & { kind: "PHOTO"; url: string; previewUrl: string }) | null;
  previewVisual: StageVisual;
  onOpenLightbox: () => void;
}) {
  if (!isAlbumOpen) {
    return (
      <AlbumStage
        sectionLabel="Photo album"
        album={album}
        visual={previewVisual}
        emptyMessage="Выберите альбом слева, чтобы открыть фотосцену."
      />
    );
  }

  return (
    <div className="viewer-stage viewer-stage--media photo-stage">
      {media ? (
        <button type="button" className="viewer-image-button" onClick={onOpenLightbox}>
          <div className="polaroid polaroid--large">
            <div className="polaroid-media polaroid-media--large">
              <img
                key={media.id}
                src={media.url}
                alt={getPhotoCaption(media)}
                className="polaroid-image polaroid-image--large"
              />
            </div>
            <div className="polaroid-caption">{getPhotoCaption(media)}</div>
          </div>
        </button>
      ) : (
        <div className="album-stage-empty">
          <p className="album-stage-kicker">Photo album</p>
          <h2>В этом альбоме пока нет опубликованных фотографий.</h2>
        </div>
      )}
    </div>
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

type StageVisual =
  | {
      kind: "image";
      src: string;
      alt: string;
    }
  | {
      kind: "empty";
    };

function AlbumStage({
  sectionLabel,
  album,
  visual,
  emptyMessage,
}: {
  sectionLabel: string;
  album: SectionPageAlbum | null;
  visual: StageVisual;
  emptyMessage: string;
}) {
  return (
    <section className="viewer-stage viewer-stage--preview">
      <div className="stage-visual">
        {visual.kind === "image" ? (
          <img src={visual.src} alt={visual.alt} />
        ) : (
          <div className="stage-visual-fallback" aria-hidden="true" />
        )}

        <div className="stage-overlay">
          <div className="stage-content">
            <p className="album-stage-kicker">{sectionLabel}</p>
            <h1>{album?.title ?? "Новый альбом скоро появится"}</h1>
            <p>
              {album?.description ??
                (album
                  ? "Откройте альбом, чтобы перейти от preview-сцены к полноценному просмотру."
                  : emptyMessage)}
            </p>
          </div>
        </div>
      </div>
    </section>
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

function getAlbumCardPreview(sectionType: SectionPageData["section"]["type"], album: SectionPageAlbum) {
  const firstAlbumVideo = album.videos?.[0] ?? null;

  if (sectionType === "VIDEO") {
    const previewImage =
      album.coverUrl ??
      album.videos?.find((video) => video.thumbnailUrl)?.thumbnailUrl ??
      album.videos?.[0]?.thumbnailUrl ??
      null;

    if (previewImage) {
      return { kind: "image" as const, src: previewImage };
    }

    if (firstAlbumVideo?.videoUrl) {
      return { kind: "video" as const, src: firstAlbumVideo.videoUrl };
    }

    return { kind: "empty" as const, src: null };
  }

  return {
    kind: "image" as const,
    src: album.photos?.[0]?.thumbnailUrl ?? album.photos?.[0]?.imageUrl ?? "/img/photo.png",
  };
}

function getAlbumStageVisual(
  sectionType: SectionPageData["section"]["type"],
  album: SectionPageAlbum | null,
): StageVisual {
  if (!album) {
    return { kind: "empty" };
  }

  if (sectionType === "VIDEO") {
    const src =
      album.coverUrl ??
      album.videos?.find((video) => video.thumbnailUrl)?.thumbnailUrl ??
      album.videos?.[0]?.thumbnailUrl ??
      null;

    return src ? { kind: "image", src, alt: album.title } : { kind: "empty" };
  }

  if (sectionType === "PHOTO") {
    const src = album.photos?.[0]?.imageUrl ?? album.photos?.[0]?.thumbnailUrl ?? album.coverUrl ?? null;

    return src ? { kind: "image", src, alt: album.title } : { kind: "empty" };
  }

  return { kind: "empty" };
}
