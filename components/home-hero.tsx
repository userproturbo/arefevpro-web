"use client";

import Image from "next/image";
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
  const [isClient, setIsClient] = useState(false);

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
    setIsClient(true);
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
        {isClient && currentVideo ? (
          <video
            key={currentVideo.id}
            className="hero-video fade-in"
            src={currentVideo.videoUrl}
            poster={currentVideo.posterUrl ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="none"
          />
        ) : (
          <div
            className="hero-fallback"
            style={{
              backgroundImage:
                "radial-gradient(circle at 18% 20%, rgba(216, 194, 157, 0.16), transparent 26%), linear-gradient(135deg, rgba(8, 8, 8, 0.96), rgba(20, 20, 20, 0.96))",
            }}
          />
        )}
      </div>

      <div className="hero-overlay" aria-hidden="true" />
      <SiteNavigation className="site-nav--hero" />

      <div className="hero-copy hero-content">
        <h1>
          Добро пожаловать
          <br />
          в мир FPV-полетов
          <br />
          где границы 
          <br />
          существуют
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

      <Image
        src="/img/main.png"
        alt=""
        width={853}
        height={1280}
        className="hero-person"
        priority
        aria-hidden="true"
      />
      <Image
        src="/img/drone.png"
        alt=""
        width={1536}
        height={1024}
        className={`hero-drone ${droneVisible ? "is-visible" : ""}`}
        priority={false}
        aria-hidden="true"
      />
    </main>
  );
}
