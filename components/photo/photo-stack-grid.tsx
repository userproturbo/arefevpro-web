"use client";

import { useEffect, useMemo, useRef } from "react";
import { getPhotoCaption } from "@/components/photo/album-stack";

type PhotoStackGridPhoto = {
  id: string;
  url: string;
  previewUrl?: string | null;
  title?: string | null;
  fileName?: string | null;
  originalName?: string | null;
};

type PhotoStackGridProps = {
  photos: PhotoStackGridPhoto[];
  activePhotoId: string | null;
  onSelectPhoto: (photoId: string) => void;
};

function getBaseRotation(id: string) {
  let hash = 0;

  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) | 0;
  }

  return ((Math.abs(hash) % 1000) / 1000) * 10 - 5;
}

function getAspectRatio(id: string) {
  const ratios = ["0.76", "0.88", "0.7", "0.82", "0.66"];
  const seed = id.split("").reduce((accumulator, char) => accumulator + char.charCodeAt(0), 0);
  return ratios[Math.abs(seed) % ratios.length];
}

function getStaggerOffset(id: string, index: number) {
  const offsets = [-18, 10, -8, 16, -12, 8];
  return `${offsets[(index + id.length) % offsets.length]}px`;
}

export function PhotoStackGrid({ photos, activePhotoId, onSelectPhoto }: PhotoStackGridProps) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const baseRotations = useMemo(
    () =>
      Object.fromEntries(
        photos.map((photo) => [photo.id, `${getBaseRotation(photo.id).toFixed(2)}deg`]),
      ) as Record<string, string>,
    [photos],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        });
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -10% 0px",
      },
    );

    const elements = photos
      .map((photo) => itemRefs.current[photo.id])
      .filter((element): element is HTMLButtonElement => Boolean(element));

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [photos]);

  useEffect(() => {
    const container = gridRef.current;

    if (!container) {
      return;
    }

    let frame = 0;

    const updateTransforms = () => {
      frame = 0;
      const viewportHeight = window.innerHeight || 1;
      const containerRect = container.getBoundingClientRect();
      const containerCenterX = containerRect.left + containerRect.width / 2;

      photos.forEach((photo) => {
        const element = itemRefs.current[photo.id];

        if (!element) {
          return;
        }

        const rect = element.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        const centerX = rect.left + rect.width / 2;
        const verticalProgress = (viewportHeight / 2 - centerY) / viewportHeight;
        const horizontalProgress = (containerCenterX - centerX) / Math.max(containerRect.width, 1);
        const shift = Math.max(-18, Math.min(18, verticalProgress * 30));
        const sway = Math.max(-14, Math.min(14, horizontalProgress * 24));
        const liveRotate = Math.max(-3.2, Math.min(3.2, verticalProgress * 7));

        element.style.setProperty("--card-shift", `${shift.toFixed(2)}px`);
        element.style.setProperty("--card-sway", `${sway.toFixed(2)}px`);
        element.style.setProperty("--card-rotate-live", `${liveRotate.toFixed(2)}deg`);
      });
    };

    const requestUpdate = () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }

      frame = requestAnimationFrame(updateTransforms);
    };

    requestUpdate();

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    container.addEventListener("scroll", requestUpdate, { passive: true });

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      container.removeEventListener("scroll", requestUpdate);

      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [photos]);

  if (photos.length === 0) {
    return <div className="viewer-empty-block">В этом альбоме пока нет опубликованных фотографий.</div>;
  }

  return (
    <div ref={gridRef} className="photo-stack-grid" aria-label="Album photos">
      {photos.map((photo, index) => {
        const caption = getPhotoCaption(photo);
        const isActive = activePhotoId === photo.id;

        return (
          <button
            key={photo.id}
            ref={(element) => {
              itemRefs.current[photo.id] = element;
            }}
            type="button"
            className={`photo-card ${isActive ? "is-active" : ""}`}
            style={{
              ["--card-rotate-base" as string]: baseRotations[photo.id],
              ["--card-aspect" as string]: getAspectRatio(photo.id),
              ["--card-stagger" as string]: getStaggerOffset(photo.id, index),
            }}
            onClick={() => onSelectPhoto(photo.id)}
          >
            <div className="photo-card-inner">
              <img
                src={photo.previewUrl ?? photo.url}
                alt={caption}
                loading={index < 4 ? "eager" : "lazy"}
                decoding="async"
                sizes="(max-width: 767px) 72vw, (max-width: 1100px) 42vw, 28vw"
              />
            </div>
            <div className="photo-card-copy">
              <strong>{caption}</strong>
              <span>{String(index + 1).padStart(2, "0")}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
