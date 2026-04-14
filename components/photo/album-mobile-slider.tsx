"use client";

import { useEffect, useRef } from "react";
import { DotsIndicator } from "@/components/ui/dots-indicator";
import { AlbumDescription } from "@/components/photo/album-description";
import type { SectionPageAlbum } from "@/lib/services/sections";

type AlbumMobileSliderProps = {
  albums: SectionPageAlbum[];
  activeAlbumId: string | null;
  onActiveAlbumChange: (albumId: string) => void;
  onOpenAlbum: (albumId: string) => void;
};

export function AlbumMobileSlider({
  albums,
  activeAlbumId,
  onActiveAlbumChange,
  onOpenAlbum,
}: AlbumMobileSliderProps) {
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const activeIndex = Math.max(
    0,
    albums.findIndex((album) => album.id === activeAlbumId),
  );
  const activeAlbum = albums[activeIndex] ?? null;

  useEffect(() => {
    const container = sliderRef.current;

    if (!container || albums.length === 0) {
      return;
    }

    let frame = 0;

    const syncActiveSlide = () => {
      frame = 0;

      const containerBox = container.getBoundingClientRect();
      const containerCenter = containerBox.left + containerBox.width / 2;

      let nextId = albums[0]?.id ?? null;
      let minDistance = Number.POSITIVE_INFINITY;

      albums.forEach((album) => {
        const element = itemRefs.current[album.id];

        if (!element) {
          return;
        }

        const box = element.getBoundingClientRect();
        const elementCenter = box.left + box.width / 2;
        const distance = Math.abs(containerCenter - elementCenter);

        if (distance < minDistance) {
          minDistance = distance;
          nextId = album.id;
        }
      });

      if (nextId && nextId !== activeAlbumId) {
        onActiveAlbumChange(nextId);
      }
    };

    const handleScroll = () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }

      frame = requestAnimationFrame(syncActiveSlide);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    syncActiveSlide();

    return () => {
      container.removeEventListener("scroll", handleScroll);

      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [activeAlbumId, albums, onActiveAlbumChange]);

  useEffect(() => {
    if (!activeAlbumId) {
      return;
    }

    const element = itemRefs.current[activeAlbumId];

    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeAlbumId]);

  if (albums.length === 0) {
    return <div className="viewer-empty-block">В этом разделе пока нет альбомов.</div>;
  }

  return (
    <div className="photo-mobile-shell">
      <div ref={sliderRef} className="photo-mobile-slider" aria-label="Photo albums">
        {albums.map((album) => {
          const stackImages = Array.from({ length: 3 }, (_, index) => {
            return album.photos?.[index]?.thumbnailUrl ?? album.photos?.[index]?.imageUrl ?? null;
          });
          const isActive = album.id === activeAlbum?.id;

          return (
            <button
              key={album.id}
              ref={(element) => {
                itemRefs.current[album.id] = element;
              }}
              type="button"
              className={`photo-mobile-slide ${isActive ? "is-active" : ""}`}
              onClick={() => {
                if (isActive) {
                  onOpenAlbum(album.id);
                  return;
                }

                onActiveAlbumChange(album.id);
                itemRefs.current[album.id]?.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                  inline: "center",
                });
              }}
            >
              <span className="photo-mobile-stack" aria-hidden="true">
                {stackImages.map((image, index) => (
                  <span key={`${album.id}-${index}`} className={`photo-mobile-stack-layer layer-${index + 1}`}>
                    {image ? (
                      <img src={image} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <span className="photo-mobile-stack-fallback" />
                    )}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <DotsIndicator count={albums.length} current={activeIndex} />

      <div className="photo-mobile-description-card">
        <AlbumDescription album={activeAlbum} />
      </div>
    </div>
  );
}
