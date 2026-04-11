"use client";

import "keen-slider/keen-slider.min.css";
import { useKeenSlider } from "keen-slider/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DotsIndicator } from "@/components/ui/dots-indicator";
import { AlbumDescription } from "@/components/photo/album-description";
import type { SectionPageAlbum } from "@/lib/services/sections";

type AlbumMobileSliderProps = {
  albums: SectionPageAlbum[];
};

export function AlbumMobileSlider({ albums }: AlbumMobileSliderProps) {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [sliderRef] = useKeenSlider<HTMLDivElement>({
    initial: 0,
    mode: "snap",
    rubberband: true,
    slideChanged(slider) {
      setCurrent(slider.track.details.rel);
    },
    slides: {
      perView: 1,
      spacing: 0,
    },
  });

  const activeAlbum = albums[current] ?? null;

  if (albums.length === 0) {
    return <div className="viewer-empty-block">В этом разделе пока нет альбомов.</div>;
  }

  return (
    <div className="photo-mobile-shell">
      <div ref={sliderRef} className="keen-slider photo-mobile-slider">
        {albums.map((album, index) => {
          const previewImage =
            album.photos?.[0]?.thumbnailUrl ?? album.photos?.[0]?.imageUrl ?? album.coverUrl ?? "/img/photo.png";

          return (
            <div key={album.id} className="keen-slider__slide photo-mobile-slide">
              <article
                className="viewer-album-card viewer-album-card--photo album-card photo-mobile-card"
                onClick={() => {
                  if (index === current) {
                    router.push(`/photo/${album.slug}`);
                  }
                }}
              >
                <div className="polaroid polaroid--mobile-card">
                  <div className="polaroid-media">
                    {previewImage ? (
                      <img src={previewImage} alt={album.title} className="polaroid-image polaroid-image--thumb" />
                    ) : (
                      <div className="album-preview-fallback" aria-hidden="true" />
                    )}
                  </div>
                  <div className="polaroid-caption">{album.title}</div>
                </div>
              </article>
            </div>
          );
        })}
      </div>

      <DotsIndicator count={albums.length} current={current} />
      <div className="photo-mobile-description-card">
        <AlbumDescription album={activeAlbum} />
      </div>
    </div>
  );
}
