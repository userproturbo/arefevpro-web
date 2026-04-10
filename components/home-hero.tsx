"use client";

import { useEffect, useState } from "react";
import { SiteNavigation } from "@/components/site-navigation";

type HeroVideo = {
  id: string;
  title: string;
  videoUrl: string;
  posterUrl: string | null;
};

type HomeHeroProps = {
  videos: HeroVideo[];
};

export function HomeHero({ videos }: HomeHeroProps) {
  const [droneVisible, setDroneVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const hasVideos = videos.length > 0;
  const hasMultipleVideos = videos.length > 1;
  const currentVideo = hasVideos ? videos[currentIndex] ?? videos[0] : null;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDroneVisible(true);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    setCurrentIndex(0);
  }, [videos.length]);

  const handleNext = () => {
    if (!hasMultipleVideos) {
      return;
    }

    setCurrentIndex((prev) => (prev + 1) % videos.length);
  };

  return (
    <main className="hero-page" onClick={handleNext}>
      <div className="hero-media-layer" aria-hidden="true">
        <div className="hero-fallback-layer" />
        {currentVideo ? (
          <video
            key={currentVideo.id}
            className="hero-video fade-in"
            src={currentVideo.videoUrl}
            poster={currentVideo.posterUrl ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : (
          <div
            className="hero-fallback"
            style={{
              backgroundImage:
                "linear-gradient(rgba(5, 5, 5, 0.3), rgba(5, 5, 5, 0.6)), url('/img/photo.png')",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
            }}
          />
        )}
      </div>

      <div className="hero-overlay" aria-hidden="true" />
      <SiteNavigation />

      <div className="hero-copy hero-content">
        <h1>
          Добро пожаловать в мир FPV-полетов,
          <br />
          где границы существуют
          <br />
          только на земле
        </h1>
      </div>

      {hasMultipleVideos ? (
        <div className="hero-dots">
          {videos.map((video, index) => (
            <button
              key={video.id}
              type="button"
              className={`hero-dot ${index === currentIndex ? "is-active" : ""}`}
              aria-label={`Переключить на видео ${index + 1}`}
              aria-pressed={index === currentIndex}
              onClick={(event) => {
                event.stopPropagation();
                setCurrentIndex(index);
              }}
            />
          ))}
        </div>
      ) : null}

      <img src="/img/main.png" alt="" className="hero-person" aria-hidden="true" />
      <img
        src="/img/drone.png"
        alt=""
        className={`hero-drone ${droneVisible ? "is-visible" : ""}`}
        aria-hidden="true"
      />
    </main>
  );
}
