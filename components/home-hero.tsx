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
  video: HeroVideo | null;
};

export function HomeHero({ video }: HomeHeroProps) {
  const [droneVisible, setDroneVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDroneVisible(true);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="hero-page">
      <div className="hero-media-layer" aria-hidden="true">
        <div className="hero-fallback-layer" />
        {video ? (
          <video
            key={video.id}
            className="hero-video fade-in"
            src={video.videoUrl}
            poster={video.posterUrl ?? undefined}
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
