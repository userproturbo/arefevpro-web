"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SiteNavigation } from "@/components/site-navigation";
import type { MusicPlaylistDetail, MusicTrack } from "@/lib/services/music";

type AdminMusicManagerProps = {
  initialPlaylists: MusicPlaylistDetail[];
};

type PlaylistFormState = {
  title: string;
  description: string;
  coverUrl: string;
  type: "PLAYLIST" | "RADIO" | "PODCAST";
};

type TrackFormState = {
  title: string;
  author: string;
  audioUrl: string;
  description: string;
  duration: string;
};

const defaultPlaylistForm: PlaylistFormState = {
  title: "",
  description: "",
  coverUrl: "",
  type: "PLAYLIST",
};

const defaultTrackForm: TrackFormState = {
  title: "",
  author: "",
  audioUrl: "",
  description: "",
  duration: "",
};

export function AdminMusicManager({ initialPlaylists }: AdminMusicManagerProps) {
  const [playlists, setPlaylists] = useState(initialPlaylists);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(initialPlaylists[0]?.id ?? "");
  const [createPlaylistForm, setCreatePlaylistForm] = useState<PlaylistFormState>(defaultPlaylistForm);
  const [playlistForm, setPlaylistForm] = useState<PlaylistFormState>(defaultPlaylistForm);
  const [trackForm, setTrackForm] = useState<TrackFormState>(defaultTrackForm);
  const [message, setMessage] = useState<string | null>(null);
  const [savingPlaylist, setSavingPlaylist] = useState(false);
  const [savingTrack, setSavingTrack] = useState(false);
  const [deletingPlaylistId, setDeletingPlaylistId] = useState<string | null>(null);
  const [deletingTrackId, setDeletingTrackId] = useState<string | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedPlaylist = useMemo(
    () => playlists.find((playlist) => playlist.id === selectedPlaylistId) ?? playlists[0] ?? null,
    [playlists, selectedPlaylistId],
  );

  useEffect(() => {
    if (!selectedPlaylist) {
      setPlaylistForm(defaultPlaylistForm);
      return;
    }

    setPlaylistForm({
      title: selectedPlaylist.title,
      description: selectedPlaylist.description ?? "",
      coverUrl: selectedPlaylist.coverUrl ?? "",
      type: selectedPlaylist.type,
    });
  }, [selectedPlaylist]);

  async function refreshPlaylists(preferredId?: string) {
    const response = await fetch("/api/music/playlists");
    const payload = (await response.json()) as MusicPlaylistDetail[] | { error?: string };

    if (!response.ok || !Array.isArray(payload)) {
      throw new Error(("error" in payload && payload.error) || "Не удалось загрузить плейлисты");
    }

    const nextPlaylists = payload as MusicPlaylistDetail[];
    setPlaylists(nextPlaylists);
    setSelectedPlaylistId(nextPlaylists.find((playlist) => playlist.id === preferredId)?.id ?? nextPlaylists[0]?.id ?? "");
  }

  async function handleCreatePlaylist(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPlaylist(true);
    setMessage(null);

    try {
      const response = await fetch("/api/music/playlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: createPlaylistForm.title,
          description: createPlaylistForm.description || undefined,
          coverUrl: createPlaylistForm.coverUrl || undefined,
          type: createPlaylistForm.type,
        }),
      });

      const payload = (await response.json()) as MusicPlaylistDetail | { error?: string };

      if (!response.ok || "error" in payload) {
        throw new Error(("error" in payload && payload.error) || "Не удалось создать плейлист");
      }

      const playlist = payload as MusicPlaylistDetail;
      await refreshPlaylists(playlist.id);
      setCreatePlaylistForm(defaultPlaylistForm);
      setMessage(`Плейлист создан: ${playlist.title}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось создать плейлист");
    } finally {
      setSavingPlaylist(false);
    }
  }

  async function handleUpdatePlaylist(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedPlaylist) {
      return;
    }

    setSavingPlaylist(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/music/playlists/${selectedPlaylist.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: playlistForm.title,
          description: playlistForm.description || null,
          coverUrl: playlistForm.coverUrl || null,
          type: playlistForm.type,
        }),
      });

      const payload = (await response.json()) as MusicPlaylistDetail | { error?: string };

      if (!response.ok || "error" in payload) {
        throw new Error(("error" in payload && payload.error) || "Не удалось обновить плейлист");
      }

      await refreshPlaylists(selectedPlaylist.id);
      setMessage(`Плейлист обновлён: ${(payload as MusicPlaylistDetail).title}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось обновить плейлист");
    } finally {
      setSavingPlaylist(false);
    }
  }

  async function handleDeletePlaylist() {
    if (!selectedPlaylist) {
      return;
    }

    if (!confirm(`Удалить плейлист «${selectedPlaylist.title}»?`)) {
      return;
    }

    setDeletingPlaylistId(selectedPlaylist.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/music/playlists/${selectedPlaylist.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Не удалось удалить плейлист");
      }

      await refreshPlaylists();
      setMessage(`Плейлист удалён: ${selectedPlaylist.title}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось удалить плейлист");
    } finally {
      setDeletingPlaylistId(null);
    }
  }

  async function handleCreateTrack(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedPlaylist) {
      setMessage("Сначала выберите плейлист");
      return;
    }

    setSavingTrack(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/music/playlists/${selectedPlaylist.id}/tracks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: trackForm.title,
          author: trackForm.author || undefined,
          audioUrl: trackForm.audioUrl,
          description: trackForm.description || undefined,
          duration: trackForm.duration ? Number(trackForm.duration) : undefined,
        }),
      });

      const payload = (await response.json()) as MusicTrack | { error?: string };

      if (!response.ok || "error" in payload) {
        throw new Error(("error" in payload && payload.error) || "Не удалось добавить трек");
      }

      await refreshPlaylists(selectedPlaylist.id);
      setTrackForm(defaultTrackForm);
      setMessage(`Трек добавлен: ${(payload as MusicTrack).title}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось добавить трек");
    } finally {
      setSavingTrack(false);
    }
  }

  async function handleUploadAudioFile(file: File) {
    setUploadingAudio(true);
    setMessage(null);

    try {
      const uploadResult = await uploadFile(file);
      const metadata = await readAudioMetadata(file);

      setTrackForm((current) => ({
        ...current,
        title: current.title || file.name.replace(/\.[^.]+$/, ""),
        audioUrl: uploadResult.publicUrl,
        duration: metadata.durationSec ? String(metadata.durationSec) : current.duration,
      }));

      setMessage(`Файл загружен: ${file.name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось загрузить аудио");
    } finally {
      setUploadingAudio(false);
    }
  }

  async function handleDeleteTrack(track: MusicTrack) {
    setDeletingTrackId(track.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/music/tracks/${track.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Не удалось удалить трек");
      }

      await refreshPlaylists(selectedPlaylist?.id);
      setMessage(`Трек удалён: ${track.title}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось удалить трек");
    } finally {
      setDeletingTrackId(null);
    }
  }

  async function moveTrack(track: MusicTrack, direction: -1 | 1) {
    if (!selectedPlaylist) {
      return;
    }

    const nextOrder = track.order + direction;

    if (nextOrder < 0 || nextOrder >= selectedPlaylist.tracks.length) {
      return;
    }

    setMessage(null);

    try {
      const response = await fetch(`/api/music/tracks/${track.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order: nextOrder,
        }),
      });

      const payload = (await response.json()) as MusicTrack | { error?: string };

      if (!response.ok || "error" in payload) {
        throw new Error(("error" in payload && payload.error) || "Не удалось изменить порядок трека");
      }

      await refreshPlaylists(selectedPlaylist.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось изменить порядок трека");
    }
  }

  async function saveTrack(track: MusicTrack) {
    setMessage(null);

    try {
      const response = await fetch(`/api/music/tracks/${track.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: track.title,
          author: track.author,
          audioUrl: track.audioUrl,
          description: track.description,
          duration: track.duration,
        }),
      });

      const payload = (await response.json()) as MusicTrack | { error?: string };

      if (!response.ok || "error" in payload) {
        throw new Error(("error" in payload && payload.error) || "Не удалось сохранить трек");
      }

      await refreshPlaylists(selectedPlaylist?.id);
      setMessage(`Трек обновлён: ${(payload as MusicTrack).title}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить трек");
    }
  }

  function patchTrackLocally(trackId: string, patch: Partial<MusicTrack>) {
    setPlaylists((current) =>
      current.map((playlist) =>
        playlist.id !== selectedPlaylistId
          ? playlist
          : {
              ...playlist,
              tracks: playlist.tracks.map((track) =>
                track.id === trackId
                  ? {
                      ...track,
                      ...patch,
                    }
                  : track,
              ),
            },
      ),
    );
  }

  return (
    <main className="viewer-page admin-viewer-page music-admin-page">
      <SiteNavigation className="viewer-header" />

      <div className="viewer-layout admin-layout music-admin-layout">
        <aside className="viewer-sidebar admin-sidebar admin-sidebar-column">
          <div className="viewer-sidebar-head admin-sidebar-head">
            <p className="editorial-kicker">Admin Music</p>
            <h2 className="admin-sidebar-title">Playlists</h2>
          </div>

          <form className="editorial-form admin-form-panel" onSubmit={handleCreatePlaylist}>
            <h3>Новый плейлист</h3>

            <label className="admin-form-field">
              <span>Название</span>
              <input
                value={createPlaylistForm.title}
                onChange={(event) => setCreatePlaylistForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Название плейлиста"
                required
              />
            </label>

            <label className="admin-form-field">
              <span>Тип</span>
              <select
                value={createPlaylistForm.type}
                onChange={(event) =>
                  setCreatePlaylistForm((current) => ({
                    ...current,
                    type: event.target.value as PlaylistFormState["type"],
                  }))
                }
              >
                <option value="PLAYLIST">PLAYLIST</option>
                <option value="RADIO">RADIO</option>
                <option value="PODCAST">PODCAST</option>
              </select>
            </label>

            <label className="admin-form-field">
              <span>Cover URL</span>
              <input
                value={createPlaylistForm.coverUrl}
                onChange={(event) =>
                  setCreatePlaylistForm((current) => ({ ...current, coverUrl: event.target.value }))
                }
                placeholder="https://..."
              />
            </label>

            <label className="admin-form-field">
              <span>Описание</span>
              <textarea
                value={createPlaylistForm.description}
                onChange={(event) =>
                  setCreatePlaylistForm((current) => ({ ...current, description: event.target.value }))
                }
                rows={4}
                placeholder="Описание плейлиста"
              />
            </label>

            <button type="submit" className="button-primary admin-submit-button" disabled={savingPlaylist}>
              {savingPlaylist ? "Создание..." : "Создать"}
            </button>
          </form>

          <div className="viewer-list admin-album-list">
            {playlists.length > 0 ? (
              playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  type="button"
                  className={`viewer-album-card admin-album-card ${
                    selectedPlaylist?.id === playlist.id ? "is-active" : ""
                  }`}
                  onClick={() => setSelectedPlaylistId(playlist.id)}
                >
                  <strong>{playlist.title}</strong>
                  <span>{playlist.trackCount} tracks</span>
                </button>
              ))
            ) : (
              <div className="viewer-empty-block">Плейлистов пока нет.</div>
            )}
          </div>
        </aside>

        <section className="viewer-main admin-main">
          <div className="admin-main-shell">
            <div className="content-header admin-content-header">
              <div>
                <p className="editorial-kicker">Music Editor</p>
                <h2>{selectedPlaylist ? selectedPlaylist.title : "Выберите плейлист"}</h2>
              </div>
            </div>

            {message ? <p className="feedback-text">{message}</p> : null}

            {!selectedPlaylist ? (
              <div className="placeholder-panel viewer-placeholder-panel admin-empty-panel">
                <h3>Плейлист не выбран</h3>
                <p>Создайте плейлист слева или выберите существующий.</p>
              </div>
            ) : (
              <>
                <form className="editorial-form admin-form-panel music-editor-panel" onSubmit={handleUpdatePlaylist}>
                  <h3>Настройки плейлиста</h3>

                  <label className="admin-form-field">
                    <span>Название</span>
                    <input
                      value={playlistForm.title}
                      onChange={(event) => setPlaylistForm((current) => ({ ...current, title: event.target.value }))}
                      required
                    />
                  </label>

                  <label className="admin-form-field">
                    <span>Тип</span>
                    <select
                      value={playlistForm.type}
                      onChange={(event) =>
                        setPlaylistForm((current) => ({
                          ...current,
                          type: event.target.value as PlaylistFormState["type"],
                        }))
                      }
                    >
                      <option value="PLAYLIST">PLAYLIST</option>
                      <option value="RADIO">RADIO</option>
                      <option value="PODCAST">PODCAST</option>
                    </select>
                  </label>

                  <label className="admin-form-field">
                    <span>Cover URL</span>
                    <input
                      value={playlistForm.coverUrl}
                      onChange={(event) => setPlaylistForm((current) => ({ ...current, coverUrl: event.target.value }))}
                    />
                  </label>

                  <label className="admin-form-field">
                    <span>Описание</span>
                    <textarea
                      value={playlistForm.description}
                      onChange={(event) =>
                        setPlaylistForm((current) => ({ ...current, description: event.target.value }))
                      }
                      rows={4}
                    />
                  </label>

                  <div className="upload-actions">
                    <button type="submit" className="button-primary" disabled={savingPlaylist}>
                      {savingPlaylist ? "Сохранение..." : "Сохранить"}
                    </button>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={handleDeletePlaylist}
                      disabled={deletingPlaylistId === selectedPlaylist.id}
                    >
                      {deletingPlaylistId === selectedPlaylist.id ? "Удаление..." : "Удалить плейлист"}
                    </button>
                  </div>
                </form>

                <form className="upload-panel admin-upload-panel music-editor-panel" onSubmit={handleCreateTrack}>
                  <h3>Добавить трек</h3>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp3"
                    className="hidden-input"
                    onChange={(event) => {
                      const file = event.target.files?.[0];

                      if (file) {
                        void handleUploadAudioFile(file);
                      }
                    }}
                  />

                  <div className="upload-actions music-upload-actions">
                    <button type="button" className="button-secondary" onClick={() => fileInputRef.current?.click()}>
                      {uploadingAudio ? "Загрузка..." : "Загрузить аудио"}
                    </button>
                    <span>Или вставьте внешний URL вручную</span>
                  </div>

                  <label className="admin-form-field">
                    <span>Название</span>
                    <input
                      value={trackForm.title}
                      onChange={(event) => setTrackForm((current) => ({ ...current, title: event.target.value }))}
                      required
                    />
                  </label>

                  <label className="admin-form-field">
                    <span>Автор</span>
                    <input
                      value={trackForm.author}
                      onChange={(event) => setTrackForm((current) => ({ ...current, author: event.target.value }))}
                    />
                  </label>

                  <label className="admin-form-field">
                    <span>Audio URL</span>
                    <input
                      value={trackForm.audioUrl}
                      onChange={(event) => setTrackForm((current) => ({ ...current, audioUrl: event.target.value }))}
                      placeholder="https://..."
                      required
                    />
                  </label>

                  <label className="admin-form-field">
                    <span>Duration (sec)</span>
                    <input
                      value={trackForm.duration}
                      onChange={(event) => setTrackForm((current) => ({ ...current, duration: event.target.value }))}
                      inputMode="numeric"
                    />
                  </label>

                  <label className="admin-form-field">
                    <span>Описание</span>
                    <textarea
                      value={trackForm.description}
                      onChange={(event) => setTrackForm((current) => ({ ...current, description: event.target.value }))}
                      rows={3}
                    />
                  </label>

                  <button type="submit" className="button-primary" disabled={savingTrack}>
                    {savingTrack ? "Добавление..." : "Добавить трек"}
                  </button>
                </form>

                <div className="admin-grid music-track-admin-list">
                  {selectedPlaylist.tracks.length > 0 ? (
                    selectedPlaylist.tracks.map((track, index) => (
                      <article key={track.id} className="admin-card music-track-admin-card">
                        <div className="music-track-admin-head">
                          <strong>{String(index + 1).padStart(2, "0")}</strong>
                          <div className="music-track-admin-actions">
                            <button type="button" className="button-secondary" onClick={() => moveTrack(track, -1)}>
                              ↑
                            </button>
                            <button type="button" className="button-secondary" onClick={() => moveTrack(track, 1)}>
                              ↓
                            </button>
                          </div>
                        </div>

                        <label className="admin-form-field">
                          <span>Название</span>
                          <input
                            value={track.title}
                            onChange={(event) => patchTrackLocally(track.id, { title: event.target.value })}
                          />
                        </label>

                        <label className="admin-form-field">
                          <span>Автор</span>
                          <input
                            value={track.author ?? ""}
                            onChange={(event) =>
                              patchTrackLocally(track.id, { author: event.target.value || null })
                            }
                          />
                        </label>

                        <label className="admin-form-field">
                          <span>Audio URL</span>
                          <input
                            value={track.audioUrl}
                            onChange={(event) => patchTrackLocally(track.id, { audioUrl: event.target.value })}
                          />
                        </label>

                        <label className="admin-form-field">
                          <span>Описание</span>
                          <textarea
                            value={track.description ?? ""}
                            onChange={(event) =>
                              patchTrackLocally(track.id, { description: event.target.value || null })
                            }
                            rows={2}
                          />
                        </label>

                        <div className="music-track-admin-footer">
                          <button type="button" className="button-primary" onClick={() => void saveTrack(track)}>
                            Сохранить
                          </button>
                          <button
                            type="button"
                            className="button-secondary"
                            onClick={() => void handleDeleteTrack(track)}
                            disabled={deletingTrackId === track.id}
                          >
                            {deletingTrackId === track.id ? "Удаление..." : "Удалить"}
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="placeholder-panel viewer-placeholder-panel admin-empty-panel">
                      <h3>Треков пока нет</h3>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

type UploadResult = {
  publicUrl: string;
};

function uploadFile(file: File): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const formData = new FormData();

    formData.append("file", file);
    request.open("POST", "/api/upload");
    request.responseType = "json";

    request.onerror = () => reject(new Error("Ошибка загрузки файла"));
    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(request.response?.error || "Ошибка загрузки файла"));
        return;
      }

      resolve(request.response as UploadResult);
    };

    request.send(formData);
  });
}

async function readAudioMetadata(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const audio = await loadAudio(objectUrl);
    return {
      durationSec: Number.isFinite(audio.duration) ? Math.round(audio.duration) : null,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadAudio(src: string): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => resolve(audio);
    audio.onerror = () => reject(new Error("Не удалось прочитать аудио"));
    audio.src = src;
  });
}
