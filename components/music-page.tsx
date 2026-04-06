"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteNavigation } from "@/components/site-navigation";
import { useAudioPlayer } from "@/components/audio-player";
import type { MusicPageData, MusicPlaylistDetail, MusicTrack } from "@/lib/services/music";

type MusicPageProps = {
  page: MusicPageData;
};

export function MusicPage({ page }: MusicPageProps) {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>(page.playlists[0]?.id ?? "");
  const { playQueue, playTrack, isCurrentTrack, currentTrack, isPlaying } = useAudioPlayer();

  const selectedPlaylist = useMemo(
    () => page.playlists.find((playlist) => playlist.id === selectedPlaylistId) ?? page.playlists[0] ?? null,
    [page.playlists, selectedPlaylistId],
  );

  useEffect(() => {
    if (!selectedPlaylist && page.playlists[0]) {
      setSelectedPlaylistId(page.playlists[0].id);
    }
  }, [page.playlists, selectedPlaylist]);

  return (
    <main className="viewer-page music-page">
      <SiteNavigation className="viewer-header" />

      <div className="viewer-layout music-layout">
        <aside className="viewer-sidebar music-sidebar">
          <div className="viewer-sidebar-head">
            <p className="editorial-kicker">Music Library</p>
            <h2 className="admin-sidebar-title">Playlists</h2>
          </div>

          <div className="viewer-list music-playlist-list">
            {page.playlists.length > 0 ? (
              page.playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  type="button"
                  className={`viewer-album-card music-playlist-card ${
                    selectedPlaylist?.id === playlist.id ? "is-active" : ""
                  }`}
                  onClick={() => setSelectedPlaylistId(playlist.id)}
                >
                  <span className="music-playlist-type">{playlist.type.toLowerCase()}</span>
                  <strong>{playlist.title}</strong>
                  <span>{playlist.trackCount} tracks</span>
                </button>
              ))
            ) : (
              <div className="viewer-empty-block">Музыкальные плейлисты пока не опубликованы.</div>
            )}
          </div>
        </aside>

        <section className="viewer-main music-main">
          {selectedPlaylist ? (
            <MusicPlaylistContent
              playlist={selectedPlaylist}
              onPlayAll={() => playQueue(selectedPlaylist.tracks, 0)}
              onPlayTrack={(track) => playTrack(track, selectedPlaylist.tracks)}
              isTrackPlaying={(trackId) => isCurrentTrack(trackId) && isPlaying}
              currentTrackId={currentTrack?.id ?? null}
            />
          ) : (
            <div className="placeholder-panel">
              <p className="editorial-kicker">Music</p>
              <h2>No playlists yet</h2>
              <p>Создайте первый плейлист в админке, чтобы раздел появился на сайте.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function MusicPlaylistContent({
  playlist,
  onPlayAll,
  onPlayTrack,
  isTrackPlaying,
  currentTrackId,
}: {
  playlist: MusicPlaylistDetail;
  onPlayAll: () => void;
  onPlayTrack: (track: MusicTrack) => void;
  isTrackPlaying: (trackId: string) => boolean;
  currentTrackId: string | null;
}) {
  const totalDuration = playlist.tracks.reduce((sum, track) => sum + (track.duration ?? 0), 0);

  return (
    <div className="music-content-shell">
      <div className="music-hero">
        <div className="music-cover">
          {playlist.coverUrl ? (
            <img src={playlist.coverUrl} alt={playlist.title} />
          ) : (
            <div className="music-cover-fallback">
              <span>{playlist.type}</span>
            </div>
          )}
        </div>

        <div className="music-copy">
          <p className="editorial-kicker">{playlist.type}</p>
          <h1>{playlist.title}</h1>
          <p>{playlist.description ?? "Radio recordings, podcasts and personal playlists in one editorial view."}</p>

          <div className="music-meta">
            <span>{playlist.trackCount} tracks</span>
            <span>{formatDuration(totalDuration)}</span>
          </div>

          <div className="music-actions">
            <button type="button" className="button-primary" onClick={onPlayAll} disabled={playlist.tracks.length === 0}>
              Play All
            </button>
          </div>
        </div>
      </div>

      <div className="music-track-list">
        {playlist.tracks.length > 0 ? (
          playlist.tracks.map((track, index) => {
            const isActive = currentTrackId === track.id;
            const playing = isTrackPlaying(track.id);

            return (
              <div key={track.id} className={`music-track-item ${isActive ? "is-active" : ""}`}>
                <button type="button" className="music-track-play" onClick={() => onPlayTrack(track)}>
                  {playing ? "Pause" : "Play"}
                </button>

                <div className="music-track-order">{String(index + 1).padStart(2, "0")}</div>

                <div className="music-track-copy">
                  <strong>{track.title}</strong>
                  <span>{track.author ?? "Unknown author"}</span>
                  {track.description ? <p>{track.description}</p> : null}
                </div>

                <div className="music-track-duration">{formatDuration(track.duration ?? 0)}</div>
              </div>
            );
          })
        ) : (
          <div className="viewer-empty-block">В этом плейлисте пока нет треков.</div>
        )}
      </div>
    </div>
  );
}

function formatDuration(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "0:00";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
