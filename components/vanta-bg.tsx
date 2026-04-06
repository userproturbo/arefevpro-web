"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import * as THREE from "three";
import FOG from "vanta/dist/vanta.fog.min";

type VantaEffect = {
  destroy: () => void;
};

type VantaFogFactory = (options: {
  el: HTMLElement;
  THREE: typeof THREE;
  mouseControls: boolean;
  touchControls: boolean;
  gyroControls: boolean;
  highlightColor: number;
  midtoneColor: number;
  lowlightColor: number;
  baseColor: number;
  blurFactor: number;
  speed: number;
  zoom: number;
}) => VantaEffect;

export function VantaBg() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const vantaRef = useRef<HTMLDivElement | null>(null);
  const effectRef = useRef<VantaEffect | null>(null);
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    function detectMobile() {
      const nextIsMobile =
        typeof window !== "undefined" &&
        (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768);

      setIsMobile(nextIsMobile);
    }

    detectMobile();
    window.addEventListener("resize", detectMobile);

    return () => {
      window.removeEventListener("resize", detectMobile);
    };
  }, []);

  useEffect(() => {
    if (isHomePage || isMobile) {
      if (effectRef.current) {
        effectRef.current.destroy();
        effectRef.current = null;
      }

      return;
    }

    const createFog = FOG as unknown as VantaFogFactory;

    if (!isHomePage && !isMobile && !effectRef.current && vantaRef.current) {
      effectRef.current = createFog({
        el: vantaRef.current,
        THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        highlightColor: 0x000000,
        midtoneColor: 0xe33820,
        lowlightColor: 0x000000,
        baseColor: 0x000000,
        blurFactor: 0.44,
        speed: 0.8,
        zoom: 0.8,
      });
    }

    return () => {
      if (effectRef.current) {
        effectRef.current.destroy();
        effectRef.current = null;
      }
    };
  }, [isHomePage, isMobile]);

  if (isHomePage) {
    return null;
  }

  return (
    <div
      ref={vantaRef}
      className="fixed inset-0 z-0"
      style={
        isMobile
          ? {
              position: "fixed",
              inset: 0,
              zIndex: 0,
              pointerEvents: "none",
              background: `
                radial-gradient(circle at 20% 20%, rgba(216,194,157,0.15), transparent 30%),
                radial-gradient(circle at 80% 80%, rgba(227,56,32,0.12), transparent 40%),
                linear-gradient(135deg, #050505 0%, #101010 100%)
              `,
            }
          : { position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }
      }
      aria-hidden="true"
    />
  );
}
