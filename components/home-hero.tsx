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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [droneVisible, setDroneVisible] = useState(false);

  if (!videos.length) {
    return null;
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDroneVisible(true);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, []);

  function nextVideo() {
    if (videos.length < 2 || isTransitioning) {
      return;
    }

    setIsTransitioning(true);

    window.setTimeout(() => {
      setCurrentIndex((previous) => (previous + 1) % videos.length);
      setIsTransitioning(false);
    }, 300);
  }

  const currentVideo = videos[currentIndex] ?? null;

  return (
    <main className="hero-page">
      <div className="hero-media-layer" aria-hidden="true">
        <div className="hero-fallback-layer" />
        <video
          key={currentVideo.id}
          className={`hero-video ${isTransitioning ? "fade-out" : "fade-in"}`}
          src={currentVideo.videoUrl}
          poster={currentVideo.posterUrl ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onClick={nextVideo}
        />
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
