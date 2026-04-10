"use client";

import { useEffect, useRef, useState } from "react";
import { SiteNavigation } from "@/components/site-navigation";
import {
  cleanupDirectUpload,
  getUploadMediaKind,
  readMediaFileMetadata,
  uploadMediaFileDirect,
  validateMediaFileBeforeUpload,
} from "@/lib/media-upload-client";
import type { AdminAlbumCard, AdminMediaItem } from "@/lib/services/albums";
import type { SectionSummary } from "@/lib/services/sections";

type AdminSectionManagerProps = {
  currentSection: SectionSummary;
};

type AlbumFormState = {
  title: string;
  slug: string;
  description: string;
};

type UploadFormState = {
  title: string;
  isFeatured: boolean;
};

export function AdminSectionManager({ currentSection }: AdminSectionManagerProps) {
  const [albums, setAlbums] = useState<AdminAlbumCard[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>("");
  const [mediaItems, setMediaItems] = useState<AdminMediaItem[]>([]);
  const [albumForm, setAlbumForm] = useState<AlbumFormState>({
    title: "",
    slug: "",
    description: "",
  });
  const [editAlbumForm, setEditAlbumForm] = useState<AlbumFormState>({
    title: "",
    slug: "",
    description: "",
  });
  const [uploadForm, setUploadForm] = useState<UploadFormState>({
    title: "",
    isFeatured: false,
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [albumMessage, setAlbumMessage] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [loadingAlbums, setLoadingAlbums] = useState(true);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedAlbum = albums.find((album) => album.id === selectedAlbumId) ?? null;
  const mediaUploadEnabled = currentSection.slug === "video" || currentSection.slug === "photo";

  useEffect(() => {
    void loadAlbums();
  }, [currentSection.slug]);

  useEffect(() => {
    if (!selectedAlbumId) {
      setMediaItems([]);
      return;
    }

    void loadMedia(selectedAlbumId);
  }, [selectedAlbumId]);

  useEffect(() => {
    if (selectedFiles.length === 0) {
      setPreviewUrl(null);
      return;
    }

    const previewFile = selectedFiles[0];

    if (previewFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(previewFile);
      setPreviewUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    }

    setPreviewUrl(null);
    return undefined;
  }, [selectedFiles]);

  useEffect(() => {
    if (!selectedAlbum) {
      setEditAlbumForm({
        title: "",
        slug: "",
        description: "",
      });
      return;
    }

    setEditAlbumForm({
      title: selectedAlbum.title,
      slug: selectedAlbum.slug,
      description: selectedAlbum.description ?? "",
    });
  }, [selectedAlbum]);

  async function loadAlbums(preferredAlbumId?: string) {
    const shouldAutoSelectFirstAlbum = typeof preferredAlbumId === "undefined";
    setLoadingAlbums(true);

    try {
      const response = await fetch(`/api/sections/${currentSection.slug}/albums`);
      const payload = (await response.json()) as AdminAlbumCard[] | { error?: string };

      if (!response.ok || !Array.isArray(payload)) {
        throw new Error("Не удалось загрузить альбомы");
      }

      setAlbums(payload);
      const nextAlbumId =
        payload.find((album) => album.id === preferredAlbumId)?.id ??
        (shouldAutoSelectFirstAlbum ? payload[0]?.id ?? "" : "");
      setSelectedAlbumId(nextAlbumId);
    } catch (error) {
      setAlbumMessage(error instanceof Error ? error.message : "Не удалось загрузить альбомы");
      setAlbums([]);
      setSelectedAlbumId("");
    } finally {
      setLoadingAlbums(false);
    }
  }

  async function handleDeleteAlbum(album: AdminAlbumCard) {
    if (!confirm("Удалить альбом? Это действие нельзя отменить")) {
      return;
    }

    setAlbumMessage(null);

    try {
      const response = await fetch(`/api/albums/${album.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Не удалось удалить альбом");
      }

      const shouldClearSelection = selectedAlbumId === album.id;
      setAlbumMessage(`Альбом удалён: ${album.title}`);
      setShowUploader(false);
      setUploadMessage(null);
      setMediaItems((current) => (shouldClearSelection ? [] : current));
      await loadAlbums(shouldClearSelection ? "" : selectedAlbumId);
    } catch (error) {
      setAlbumMessage(error instanceof Error ? error.message : "Не удалось удалить альбом");
    }
  }

  async function loadMedia(albumId: string) {
    setLoadingMedia(true);

    try {
      const response = await fetch(`/api/albums/${albumId}/media`);
      const payload = (await response.json()) as AdminMediaItem[] | { error?: string };

      if (!response.ok || !Array.isArray(payload)) {
        throw new Error("Не удалось загрузить медиа");
      }

      setMediaItems(payload);
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Не удалось загрузить медиа");
      setMediaItems([]);
    } finally {
      setLoadingMedia(false);
    }
  }

  async function handleCreateAlbum(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingAlbum(true);
    setAlbumMessage(null);

    try {
      const response = await fetch("/api/albums", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: albumForm.title,
          slug: albumForm.slug || undefined,
          description: albumForm.description || undefined,
          sectionSlug: currentSection.slug,
          isPublished: true,
        }),
      });

      const payload = (await response.json()) as AdminAlbumCard | { error?: string };

      if (!response.ok || "error" in payload) {
        throw new Error(("error" in payload && payload.error) || "Не удалось создать альбом");
      }

      const createdAlbum = payload as AdminAlbumCard;

      setAlbumForm({
        title: "",
        slug: "",
        description: "",
      });
      setAlbumMessage(`Альбом создан: ${createdAlbum.title}`);
      await loadAlbums(createdAlbum.id);
    } catch (error) {
      setAlbumMessage(error instanceof Error ? error.message : "Не удалось создать альбом");
    } finally {
      setCreatingAlbum(false);
    }
  }

  async function handleUpdateAlbum(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedAlbum) {
      return;
    }

    setCreatingAlbum(true);
    setAlbumMessage(null);

    try {
      const response = await fetch(`/api/albums/${selectedAlbum.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editAlbumForm.title,
          slug: editAlbumForm.slug || undefined,
          description: editAlbumForm.description || undefined,
        }),
      });

      const payload = (await response.json()) as AdminAlbumCard | { error?: string };

      if (!response.ok || "error" in payload) {
        throw new Error(("error" in payload && payload.error) || "Не удалось обновить альбом");
      }

      setAlbumMessage(`Альбом обновлён: ${(payload as AdminAlbumCard).title}`);
      await loadAlbums(selectedAlbum.id);
    } catch (error) {
      setAlbumMessage(error instanceof Error ? error.message : "Не удалось обновить альбом");
    } finally {
      setCreatingAlbum(false);
    }
  }

  async function handleUploadMedia(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedAlbum || selectedFiles.length === 0) {
      setUploadMessage("Сначала выберите альбом и файлы");
      return;
    }

    for (const file of selectedFiles) {
      const validationError = validateMediaFileBeforeUpload(file, currentSection.slug);

      if (validationError) {
        setUploadMessage(validationError);
        return;
      }
    }

    setUploading(true);
    setUploadMessage(null);

    try {
      for (const [fileIndex, file] of selectedFiles.entries()) {
        const kind = getUploadMediaKind(file)?.value;

        if (!kind) {
          throw new Error("Поддерживаются только файлы MP4, WEBM, JPEG и PNG");
        }

        let uploadResult: Awaited<ReturnType<typeof uploadMediaFileDirect>> | null = null;

        try {
          uploadResult = await uploadMediaFileDirect({
            file,
            albumId: selectedAlbum.id,
            kind,
          });

          const metadata = await readMediaFileMetadata(file, kind);
          const response = await fetch("/api/media/create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              kind,
              storageKey: uploadResult.storageKey,
              publicUrl: uploadResult.publicUrl,
              mimeType: uploadResult.mimeType,
              sizeBytes: uploadResult.size,
              width: metadata.width,
              height: metadata.height,
              durationSec: metadata.durationSec,
              albumId: selectedAlbum.id,
              title:
                selectedFiles.length === 1 && uploadForm.title
                  ? uploadForm.title
                  : file.name.replace(/\.[^.]+$/, ""),
              isPublished: true,
              isFeatured: kind === "VIDEO" && fileIndex === 0 ? uploadForm.isFeatured : undefined,
            }),
          });

          const payload = (await response.json()) as { error?: string };

          if (!response.ok) {
            throw new Error(payload.error || "Не удалось загрузить медиа");
          }
        } catch (error) {
          if (uploadResult) {
            try {
              await cleanupDirectUpload(uploadResult.storageKey);
            } catch (cleanupError) {
              console.error("Failed to cleanup uploaded file", cleanupError);
            }
          }

          throw error;
        }
      }

      setSelectedFiles([]);
      setUploadForm({ title: "", isFeatured: false });
      setShowUploader(false);
      setUploadMessage(`Файлы добавлены в альбом «${selectedAlbum.title}»`);
      await Promise.all([loadAlbums(selectedAlbum.id), loadMedia(selectedAlbum.id)]);
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Не удалось загрузить медиа");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteMedia(mediaItem: AdminMediaItem) {
    setDeletingMediaId(mediaItem.id);

    try {
      const response = await fetch(`/api/media/${mediaItem.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Не удалось удалить медиа");
      }

      setUploadMessage(`Файл удалён: ${mediaItem.title}`);
      setMediaItems((current) => current.filter((item) => item.id !== mediaItem.id));
      await loadAlbums(selectedAlbumId);
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Не удалось удалить медиа");
    } finally {
      setDeletingMediaId(null);
    }
  }

  return (
    <main className="viewer-page admin-viewer-page">
      <SiteNavigation className="viewer-header" />

      <div className="viewer-layout admin-layout">
        <aside className="viewer-sidebar admin-sidebar admin-sidebar-column">
          <div className="viewer-sidebar-head admin-sidebar-head">
            <p className="editorial-kicker">Admin Section</p>
            <h2 className="admin-sidebar-title">{currentSection.title}</h2>
          </div>

          <form className="editorial-form admin-form-panel" onSubmit={handleCreateAlbum}>
            <h3>Создать альбом</h3>

            <label className="admin-form-field">
              <span>Название</span>
              <input
                value={albumForm.title}
                onChange={(event) => setAlbumForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Название"
                required
              />
            </label>

            <label className="admin-form-field">
              <span>slug</span>
              <input
                value={albumForm.slug}
                onChange={(event) => setAlbumForm((current) => ({ ...current, slug: event.target.value }))}
                placeholder="slug"
              />
            </label>

            <label className="admin-form-field">
              <span>Описание</span>
              <textarea
                value={albumForm.description}
                onChange={(event) => setAlbumForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Описание"
                rows={4}
              />
            </label>

            <button type="submit" className="button-primary admin-submit-button" disabled={creatingAlbum}>
              {creatingAlbum ? "Создание..." : "Создать"}
            </button>
          </form>

          {albumMessage ? <p className="feedback-text">{albumMessage}</p> : null}

          <div className="viewer-list admin-album-list">
            {loadingAlbums ? (
              <div className="viewer-empty-block">Загрузка альбомов...</div>
            ) : albums.length > 0 ? (
              albums.map((album) => (
                <div
                  key={album.id}
                  className={`viewer-album-card admin-album-card ${
                    album.id === selectedAlbumId ? "is-active" : ""
                  }`}
                >
                  <button type="button" className="admin-album-select" onClick={() => setSelectedAlbumId(album.id)}>
                    <strong>{album.title}</strong>
                    <span>{album.itemCount} медиа</span>
                  </button>
                  <button
                    type="button"
                    className="album-delete-btn"
                    onClick={() => handleDeleteAlbum(album)}
                  >
                    Удалить
                  </button>
                </div>
              ))
            ) : (
              <div className="viewer-empty-block">В этом разделе пока нет альбомов.</div>
            )}
          </div>
        </aside>

        <section className="viewer-main admin-main">
          <div className="admin-main-shell">
            <div className="content-header admin-content-header">
              <div>
                <div className="breadcrumbs">
                  <span>admin</span>
                  <span>/</span>
                  <span>{currentSection.slug}</span>
                  {selectedAlbum ? (
                    <>
                      <span>/</span>
                      <span className="active">{selectedAlbum.title}</span>
                    </>
                  ) : null}
                </div>
                <p className="editorial-kicker">Редактирование</p>
                <h2>{selectedAlbum ? `Альбом ${selectedAlbum.title}` : currentSection.title}</h2>
              </div>

              {mediaUploadEnabled ? (
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => setShowUploader((current) => !current)}
                  disabled={!selectedAlbum}
                >
                  Загрузить
                </button>
              ) : null}
            </div>

            {showUploader && selectedAlbum && mediaUploadEnabled ? (
              <form className="upload-panel admin-upload-panel" onSubmit={handleUploadMedia}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,image/jpeg,image/png"
                  multiple
                  className="hidden-input"
                  onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
                />

                <button
                  type="button"
                  className="upload-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <strong>
                    {selectedFiles.length > 0
                      ? selectedFiles.length === 1
                        ? selectedFiles[0].name
                        : `Выбрано файлов: ${selectedFiles.length}`
                      : "Выберите файлы"}
                  </strong>
                  <span>Поддерживаются MP4, WEBM, JPEG и PNG</span>
                  {previewUrl ? (
                    <img src={previewUrl} alt={selectedFiles[0]?.name ?? ""} className="upload-thumb" />
                  ) : null}
                </button>

                <label className="admin-form-field">
                  <span>Название</span>
                  <input
                    value={uploadForm.title}
                    onChange={(event) => setUploadForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Название файла"
                  />
                </label>

                {currentSection.slug === "video" ? (
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      checked={uploadForm.isFeatured}
                      onChange={(event) =>
                        setUploadForm((current) => ({ ...current, isFeatured: event.target.checked }))
                      }
                    />
                    <span>Сделать featured для homepage</span>
                  </label>
                ) : null}

                <div className="upload-actions">
                  <button type="submit" className="button-primary" disabled={uploading}>
                    {uploading ? "Загрузка..." : "Загрузить"}
                  </button>
                </div>
              </form>
            ) : null}

            {uploadMessage ? <p className="feedback-text">{uploadMessage}</p> : null}

            {!selectedAlbum ? (
              <div className="placeholder-panel viewer-placeholder-panel admin-empty-panel">
                <h3>Альбом не выбран</h3>
                <p>Создайте или выберите альбом слева.</p>
              </div>
            ) : (
              <>
                <form className="editorial-form admin-form-panel" onSubmit={handleUpdateAlbum}>
                  <h3>Описание альбома</h3>

                  <label className="admin-form-field">
                    <span>Название</span>
                    <input
                      value={editAlbumForm.title}
                      onChange={(event) => setEditAlbumForm((current) => ({ ...current, title: event.target.value }))}
                      required
                    />
                  </label>

                  <label className="admin-form-field">
                    <span>slug</span>
                    <input
                      value={editAlbumForm.slug}
                      onChange={(event) => setEditAlbumForm((current) => ({ ...current, slug: event.target.value }))}
                    />
                  </label>

                  <label className="admin-form-field">
                    <span>Описание</span>
                    <textarea
                      name="description"
                      value={editAlbumForm.description}
                      onChange={(event) =>
                        setEditAlbumForm((current) => ({ ...current, description: event.target.value }))
                      }
                      rows={4}
                    />
                  </label>

                  <button type="submit" className="button-primary admin-submit-button" disabled={creatingAlbum}>
                    {creatingAlbum ? "Сохранение..." : "Сохранить"}
                  </button>
                </form>

                {loadingMedia ? (
                  <div className="placeholder-panel viewer-placeholder-panel admin-empty-panel">
                    <h3>Загрузка медиа</h3>
                  </div>
                ) : mediaItems.length === 0 ? (
                  <div className="placeholder-panel viewer-placeholder-panel admin-empty-panel">
                    <h3>В этом альбоме пока нет медиа</h3>
                  </div>
                ) : (
                  <div className="admin-grid admin-media-grid">
                    {mediaItems.map((mediaItem) => (
                      <article key={mediaItem.id} className="admin-card admin-media-card">
                        <div className="admin-card-preview admin-media-preview">
                          {mediaItem.kind === "VIDEO" ? (
                            <video
                              src={mediaItem.mediaUrl}
                              poster={mediaItem.thumbnailUrl ?? undefined}
                              muted
                              playsInline
                            />
                          ) : (
                            <img src={mediaItem.mediaUrl} alt={mediaItem.title} />
                          )}

                          <div className="admin-media-title">{mediaItem.title}</div>

                          <button
                            type="button"
                            className="button-secondary admin-media-delete"
                            onClick={() => handleDeleteMedia(mediaItem)}
                            disabled={deletingMediaId === mediaItem.id}
                          >
                            {deletingMediaId === mediaItem.id ? "Удаление..." : "Удалить"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
