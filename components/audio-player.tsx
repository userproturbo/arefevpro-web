"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { MusicTrack } from "@/lib/services/music";

type AudioPlayerContextValue = {
  currentTrack: MusicTrack | null;
  queue: MusicTrack[];
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  playTrack: (track: MusicTrack, queue?: MusicTrack[]) => void;
  playQueue: (queue: MusicTrack[], startIndex?: number) => void;
  toggle: () => void;
  seek: (time: number) => void;
  next: () => void;
  previous: () => void;
  isCurrentTrack: (trackId: string) => boolean;
};

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<MusicTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "metadata";
    }

    const audio = audioRef.current;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      const currentIndex = queue.findIndex((track) => track.id === currentTrack?.id);
      const nextTrack = currentIndex >= 0 ? queue[currentIndex + 1] ?? null : null;

      if (nextTrack) {
        playTrack(nextTrack, queue);
        return;
      }

      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [currentTrack?.id, queue]);

  function playTrack(track: MusicTrack, nextQueue?: MusicTrack[]) {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (nextQueue) {
      setQueue(nextQueue);
    } else if (queue.length === 0) {
      setQueue([track]);
    }

    const shouldToggleExisting = currentTrack?.id === track.id && audio.src;

    if (shouldToggleExisting) {
      if (audio.paused) {
        void audio.play().catch(() => undefined);
      } else {
        audio.pause();
      }

      return;
    }

    setCurrentTrack(track);
    setCurrentTime(0);
    setDuration(track.duration ?? 0);
    audio.src = track.audioUrl;
    void audio.play().catch(() => {
      setIsPlaying(false);
    });
  }

  function playQueue(nextQueue: MusicTrack[], startIndex = 0) {
    const targetTrack = nextQueue[startIndex] ?? null;

    if (!targetTrack) {
      return;
    }

    setQueue(nextQueue);
    playTrack(targetTrack, nextQueue);
  }

  function toggle() {
    const audio = audioRef.current;

    if (!audio || !currentTrack) {
      return;
    }

    if (audio.paused) {
      void audio.play().catch(() => undefined);
      return;
    }

    audio.pause();
  }

  function seek(time: number) {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.currentTime = time;
    setCurrentTime(time);
  }

  function next() {
    if (!currentTrack) {
      return;
    }

    const currentIndex = queue.findIndex((track) => track.id === currentTrack.id);
    const nextTrack = currentIndex >= 0 ? queue[currentIndex + 1] ?? null : null;

    if (nextTrack) {
      playTrack(nextTrack, queue);
    }
  }

  function previous() {
    const audio = audioRef.current;

    if (!audio || !currentTrack) {
      return;
    }

    if (audio.currentTime > 5) {
      seek(0);
      return;
    }

    const currentIndex = queue.findIndex((track) => track.id === currentTrack.id);
    const previousTrack = currentIndex > 0 ? queue[currentIndex - 1] : null;

    if (previousTrack) {
      playTrack(previousTrack, queue);
    } else {
      seek(0);
    }
  }

  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrack,
        queue,
        isPlaying,
        duration,
        currentTime,
        playTrack,
        playQueue,
        toggle,
        seek,
        next,
        previous,
        isCurrentTrack: (trackId: string) => currentTrack?.id === trackId,
      }}
    >
      {children}
      <AudioPlayer />
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);

  if (!context) {
    throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  }

  return context;
}

function AudioPlayer() {
  const { currentTrack, isPlaying, currentTime, duration, toggle, seek, next, previous, queue } =
    useAudioPlayer();

  if (!currentTrack) {
    return null;
  }

  const currentIndex = queue.findIndex((track) => track.id === currentTrack.id);
  const hasPrevious = currentIndex > 0 || currentTime > 0;
  const hasNext = currentIndex >= 0 && currentIndex < queue.length - 1;

  return (
    <div className="audio-player-bar">
      <div className="audio-player-meta">
        <span className="audio-player-kicker">Now Playing</span>
        <strong>{currentTrack.title}</strong>
        <small>{currentTrack.author ?? "Unknown author"}</small>
      </div>

      <div className="audio-player-controls">
        <button type="button" onClick={previous} disabled={!hasPrevious} aria-label="Previous track">
          Prev
        </button>
        <button type="button" onClick={toggle} aria-label={isPlaying ? "Pause track" : "Play track"}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button type="button" onClick={next} disabled={!hasNext} aria-label="Next track">
          Next
        </button>
      </div>

      <div className="audio-player-progress">
        <span>{formatDuration(Math.round(currentTime))}</span>
        <input
          type="range"
          min={0}
          max={Math.max(duration, currentTrack.duration ?? 0, 0)}
          step={1}
          value={Math.min(currentTime, Math.max(duration, currentTrack.duration ?? 0, 0))}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label="Track progress"
        />
        <span>{formatDuration(Math.round(duration || currentTrack.duration || 0))}</span>
      </div>
    </div>
  );
}

function formatDuration(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "0:00";
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
