"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AdminAlbumCard, AdminMediaItem } from "@/lib/services/albums";
import type { SectionSummary } from "@/lib/services/sections";

type AdminPanelProps = {
  sections: SectionSummary[];
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

type UploadStatus = "idle" | "uploading" | "success" | "error";

type FileUploadResult = {
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  size: number;
};

const uploadStatusLabels: Record<UploadStatus, string> = {
  idle: "Ожидание",
  uploading: "Загрузка",
  success: "Успешно",
  error: "Ошибка",
};

const sectionLabels: Record<string, string> = {
  video: "Видео",
  photo: "Фото",
  blog: "Блог",
  music: "Музыка",
};

export function AdminPanel({ sections }: AdminPanelProps) {
  const [albums, setAlbums] = useState<AdminAlbumCard[]>([]);
  const [mediaItems, setMediaItems] = useState<AdminMediaItem[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>(sections[0]?.id ?? "");
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>("");
  const [albumForm, setAlbumForm] = useState<AlbumFormState>({
    title: "",
    slug: "",
    description: "",
  });
  const [uploadForm, setUploadForm] = useState<UploadFormState>({
    title: "",
    isFeatured: false,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loadingAlbums, setLoadingAlbums] = useState(false);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);
  const [isCreateAlbumOpen, setIsCreateAlbumOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [albumMessage, setAlbumMessage] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlsRef = useRef<string[]>([]);

  const selectedSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId) ?? sections[0] ?? null,
    [sections, selectedSectionId],
  );

  const selectedAlbum = useMemo(
    () => albums.find((album) => album.id === selectedAlbumId) ?? null,
    [albums, selectedAlbumId],
  );

  const mediaUploadEnabled = selectedSection?.slug === "video" || selectedSection?.slug === "photo";

  useEffect(() => {
    if (!selectedFile || !selectedFileUrl || !selectedFile.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }

    setPreviewUrl(selectedFileUrl);
  }, [selectedFile, selectedFileUrl]);

  useEffect(
    () => () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  useEffect(() => {
    if (!selectedSection) {
      return;
    }

    void loadAlbums(selectedSection.slug);
  }, [selectedSectionId]);

  useEffect(() => {
    if (!selectedAlbumId) {
      setMediaItems([]);
      return;
    }

    void loadMedia(selectedAlbumId);
  }, [selectedAlbumId]);

  useEffect(() => {
    if (selectedSection?.slug !== "video" && uploadForm.isFeatured) {
      setUploadForm((current) => ({ ...current, isFeatured: false }));
    }
  }, [selectedSection?.slug, uploadForm.isFeatured]);

  async function loadAlbums(sectionSlug: string, preferredAlbumId?: string) {
    setLoadingAlbums(true);
    setAlbumMessage(null);

    try {
      const response = await fetch(`/api/sections/${sectionSlug}/albums`);
      const payload = (await response.json()) as AdminAlbumCard[] | { error?: string };

      if (!response.ok || !Array.isArray(payload)) {
        throw new Error(
          translateAdminError(("error" in payload && payload.error) || "Не удалось загрузить альбомы"),
        );
      }

      setAlbums(payload);
      const nextAlbum =
        payload.find((album) => album.id === preferredAlbumId) ??
        payload[0] ??
        null;
      setSelectedAlbumId(nextAlbum?.id ?? "");
    } catch (error) {
      setAlbums([]);
      setSelectedAlbumId("");
      setAlbumMessage(error instanceof Error ? error.message : "Не удалось загрузить альбомы");
    } finally {
      setLoadingAlbums(false);
    }
  }

  async function loadMedia(albumId: string) {
    setLoadingMedia(true);
    setUploadMessage(null);

    try {
      const response = await fetch(`/api/albums/${albumId}/media`);
      const payload = (await response.json()) as AdminMediaItem[] | { error?: string };

      if (!response.ok || !Array.isArray(payload)) {
        throw new Error(
          translateAdminError(("error" in payload && payload.error) || "Не удалось загрузить медиа"),
        );
      }

      setMediaItems(payload);
    } catch (error) {
      setMediaItems([]);
      setUploadMessage(error instanceof Error ? error.message : "Не удалось загрузить медиа");
    } finally {
      setLoadingMedia(false);
    }
  }

  async function handleCreateAlbum(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedSection) {
      return;
    }

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
          sectionSlug: selectedSection.slug,
          description: albumForm.description || undefined,
          isPublished: true,
        }),
      });

      const payload = (await response.json()) as AdminAlbumCard | { error?: string };

      if (!response.ok || "error" in payload) {
        throw new Error(
          translateAdminError(("error" in payload && payload.error) || "Не удалось создать альбом"),
        );
      }

      const createdAlbum = payload as AdminAlbumCard;

      setAlbumForm({
        title: "",
        slug: "",
        description: "",
      });
      setIsCreateAlbumOpen(false);
      setAlbumMessage(`Альбом создан: ${createdAlbum.title}`);
      await loadAlbums(selectedSection.slug, createdAlbum.id);
    } catch (error) {
      setAlbumMessage(error instanceof Error ? error.message : "Не удалось создать альбом");
    } finally {
      setCreatingAlbum(false);
    }
  }

  async function handleUploadMedia(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedAlbum || !selectedSection) {
      setUploadMessage("Выберите альбом");
      return;
    }

    if (!selectedFile) {
      setUploadStatus("error");
      setUploadMessage("Выберите файл для загрузки");
      return;
    }

    if (!selectedFileUrl) {
      setUploadStatus("error");
      setUploadMessage("Не удалось подготовить локальный preview URL");
      return;
    }

    const kind = getMediaKind(selectedFile);

    if (!kind) {
      setUploadStatus("error");
      setUploadMessage("Поддерживаются только файлы MP4, WEBM, JPEG и PNG");
      return;
    }

    if (selectedSection.slug !== kind.sectionSlug) {
      setUploadStatus("error");
      setUploadMessage(
        `${kind.label} можно загружать только в раздел ${kind.sectionSlug.toUpperCase()}`,
      );
      return;
    }

    setUploadingMedia(true);
    setUploadStatus("uploading");
    setUploadProgress(0);
    setUploadMessage(null);

    try {
      const uploadedFile = await uploadFileWithProgress({
        file: selectedFile,
        onProgress: (progress) => setUploadProgress(progress),
      });

      const metadata = await readFileMetadata(selectedFile, kind.value);
      const mediaCreateResponse = await fetch("/api/media/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kind: kind.value,
          storageKey: uploadedFile.storageKey,
          publicUrl: uploadedFile.publicUrl,
          mimeType: uploadedFile.mimeType,
          sizeBytes: uploadedFile.size,
          width: metadata.width,
          height: metadata.height,
          durationSec: metadata.durationSec,
          albumId: selectedAlbum.id,
          title: uploadForm.title || selectedFile.name.replace(/\.[^.]+$/, ""),
          isPublished: true,
          isFeatured: kind.value === "VIDEO" ? uploadForm.isFeatured : undefined,
        }),
      });

      const mediaPayload = (await mediaCreateResponse.json()) as
        | { error?: string }
        | {
            mediaFile: { id: string };
          };

      if (!mediaCreateResponse.ok || "error" in mediaPayload || !("mediaFile" in mediaPayload)) {
        throw new Error(
          translateAdminError(("error" in mediaPayload && mediaPayload.error) || "Не удалось создать файл"),
        );
      }

      setUploadForm({
        title: "",
        isFeatured: false,
      });
      setSelectedUploadFile(null);
      setIsUploadOpen(false);
      setUploadStatus("success");
      setUploadProgress(100);
      setUploadMessage(`Файл добавлен в альбом «${selectedAlbum.title}»`);
      await Promise.all([loadAlbums(selectedSection.slug, selectedAlbum.id), loadMedia(selectedAlbum.id)]);
    } catch (error) {
      setUploadStatus("error");
      setUploadMessage(error instanceof Error ? error.message : "Ошибка загрузки файла");
    } finally {
      setUploadingMedia(false);
    }
  }

  async function handleDeleteMedia(mediaItem: AdminMediaItem) {
    if (deletingMediaId) {
      return;
    }

    setDeletingMediaId(mediaItem.id);
    setUploadMessage(null);

    try {
      const response = await fetch(`/api/media/${mediaItem.id}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(
          translateAdminError(payload.error || "Не удалось удалить файл"),
        );
      }

      setMediaItems((current) => current.filter((item) => item.id !== mediaItem.id));
      setAlbums((current) =>
        current.map((album) =>
          album.id === selectedAlbumId
            ? { ...album, itemCount: Math.max(album.itemCount - 1, 0) }
            : album,
        ),
      );
      setUploadMessage(`Файл удалён: ${mediaItem.title}`);
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Не удалось удалить файл");
    } finally {
      setDeletingMediaId(null);
    }
  }

  function setSelectedUploadFile(file: File | null) {
    setSelectedFile(file);

    if (file) {
      const nextObjectUrl = URL.createObjectURL(file);
      objectUrlsRef.current.push(nextObjectUrl);
      setSelectedFileUrl(nextObjectUrl);
    } else {
      setSelectedFileUrl(null);
    }

    setUploadStatus("idle");
    setUploadProgress(0);
  }

  return (
    <main className="admin-page admin-cms">
      <header className="admin-header">
        <div>
          <p className="eyebrow">CMS</p>
          <h1>Управление каталогом</h1>
          <p className="admin-copy">
            Section, albums и media собраны в одну трёхколоночную панель без лишних переходов.
          </p>
        </div>
      </header>

      <section className="admin-cms-shell">
        <aside className="admin-cms-column admin-cms-sections">
          <div className="admin-cms-column-head">
            <h2>Sections</h2>
            <span>{sections.length}</span>
          </div>

          <div className="admin-cms-list">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`admin-cms-item ${section.id === selectedSectionId ? "is-active" : ""}`}
                onClick={() => setSelectedSectionId(section.id)}
              >
                <div>
                  <strong>{sectionLabels[section.slug] ?? section.title}</strong>
                  <p>{section.slug}</p>
                </div>
                <span>{section.albumCount}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="admin-cms-column admin-cms-albums">
          <div className="admin-cms-column-head">
            <div>
              <h2>Albums</h2>
              <p>{selectedSection ? sectionLabels[selectedSection.slug] ?? selectedSection.title : "Section"}</p>
            </div>
            <button
              type="button"
              className="primary-link"
              onClick={() => setIsCreateAlbumOpen(true)}
              disabled={!selectedSection}
            >
              + Create album
            </button>
          </div>

          {albumMessage ? <p className="admin-feedback">{albumMessage}</p> : null}

          <div className="admin-cms-list">
            {loadingAlbums ? (
              <div className="admin-empty-state">Загрузка альбомов...</div>
            ) : albums.length === 0 ? (
              <div className="admin-empty-state">В этом разделе пока нет альбомов.</div>
            ) : (
              albums.map((album) => (
                <button
                  key={album.id}
                  type="button"
                  className={`admin-cms-item ${album.id === selectedAlbumId ? "is-active" : ""}`}
                  onClick={() => setSelectedAlbumId(album.id)}
                >
                  <div>
                    <strong>{album.title}</strong>
                    <p>{album.slug}</p>
                  </div>
                  <span>{album.itemCount}</span>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="admin-cms-column admin-cms-media">
          <div className="admin-cms-column-head">
            <div>
              <h2>Media</h2>
              <p>{selectedAlbum?.title ?? "Select album"}</p>
            </div>
            <button
              type="button"
              className="primary-link"
              onClick={() => setIsUploadOpen(true)}
              disabled={!selectedAlbum || !mediaUploadEnabled}
            >
              Upload
            </button>
          </div>

          {uploadMessage ? <p className="admin-feedback">{uploadMessage}</p> : null}

          {!mediaUploadEnabled && selectedSection ? (
            <div className="admin-empty-state">
              Для раздела {sectionLabels[selectedSection.slug] ?? selectedSection.title} загрузка медиа пока не настроена.
            </div>
          ) : loadingMedia ? (
            <div className="admin-empty-state">Загрузка медиа...</div>
          ) : !selectedAlbum ? (
            <div className="admin-empty-state">Выберите альбом, чтобы увидеть media.</div>
          ) : mediaItems.length === 0 ? (
            <div className="admin-empty-state">В этом альбоме пока нет медиа.</div>
          ) : (
            <div className="admin-media-grid">
              {mediaItems.map((mediaItem) => (
                <article key={mediaItem.id} className="admin-media-card">
                  <div className="admin-media-preview">
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
                  </div>

                  <div className="admin-media-copy">
                    <strong>{mediaItem.title}</strong>
                    <p>{mediaItem.kind === "VIDEO" ? formatDuration(mediaItem.durationSec) : "Image"}</p>
                  </div>

                  <div className="admin-media-meta">
                    {mediaItem.isFeatured ? <span>Featured</span> : null}
                    <span>{mediaItem.isPublished ? "Published" : "Draft"}</span>
                  </div>

                  <button
                    type="button"
                    className="secondary-link admin-media-delete"
                    onClick={() => handleDeleteMedia(mediaItem)}
                    disabled={deletingMediaId === mediaItem.id}
                  >
                    {deletingMediaId === mediaItem.id ? "Deleting..." : "Delete"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      {isCreateAlbumOpen && selectedSection ? (
        <div className="admin-modal" role="dialog" aria-modal="true">
          <form className="admin-modal-card" onSubmit={handleCreateAlbum}>
            <div className="admin-cms-column-head">
              <div>
                <h2>Create album</h2>
                <p>{sectionLabels[selectedSection.slug] ?? selectedSection.title}</p>
              </div>
              <button
                type="button"
                className="lightbox-close"
                onClick={() => setIsCreateAlbumOpen(false)}
              >
                Close
              </button>
            </div>

            <label className="admin-field">
              <span>Название</span>
              <input
                value={albumForm.title}
                onChange={(event) =>
                  setAlbumForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Showreel"
              />
            </label>

            <label className="admin-field">
              <span>Slug</span>
              <input
                value={albumForm.slug}
                onChange={(event) =>
                  setAlbumForm((current) => ({ ...current, slug: event.target.value }))
                }
                placeholder="optional-slug"
              />
            </label>

            <label className="admin-field">
              <span>Описание</span>
              <textarea
                value={albumForm.description}
                onChange={(event) =>
                  setAlbumForm((current) => ({ ...current, description: event.target.value }))
                }
                rows={4}
                placeholder="Короткое описание альбома"
              />
            </label>

            <div className="admin-modal-actions">
              <button type="button" className="secondary-link" onClick={() => setIsCreateAlbumOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="primary-link" disabled={creatingAlbum}>
                {creatingAlbum ? "Создание..." : "Create album"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {isUploadOpen && selectedAlbum && selectedSection ? (
        <div className="admin-modal" role="dialog" aria-modal="true">
          <form className="admin-modal-card" onSubmit={handleUploadMedia}>
            <div className="admin-cms-column-head">
              <div>
                <h2>Upload media</h2>
                <p>{selectedAlbum.title}</p>
              </div>
              <button
                type="button"
                className="lightbox-close"
                onClick={() => setIsUploadOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="admin-field">
              <span>Файл</span>
              <input
                ref={fileInputRef}
                className="admin-file-input"
                type="file"
                accept="video/mp4,video/webm,image/jpeg,image/png"
                onChange={(event) => setSelectedUploadFile(event.target.files?.[0] ?? null)}
                disabled={uploadingMedia}
              />
              <button
                type="button"
                className={`upload-dropzone is-${uploadStatus} ${dragActive ? "is-dragging" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!uploadingMedia) {
                    setDragActive(true);
                  }
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  if (!uploadingMedia) {
                    setDragActive(true);
                  }
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setDragActive(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragActive(false);
                  setSelectedUploadFile(event.dataTransfer.files?.[0] ?? null);
                }}
                disabled={uploadingMedia}
              >
                <div className="upload-dropzone-copy">
                  <strong>Перетащите файл сюда</strong>
                  <span>или нажмите для выбора</span>
                </div>

                {selectedFile ? (
                  <div className="upload-preview">
                    {previewUrl ? (
                      <img src={previewUrl} alt={selectedFile.name} className="upload-preview-image" />
                    ) : (
                      <div className="upload-preview-video">VID</div>
                    )}

                    <div className="upload-preview-copy">
                      <strong>{selectedFile.name}</strong>
                      <span>{formatFileSize(selectedFile.size)}</span>
                    </div>
                  </div>
                ) : null}
              </button>
            </div>

            <label className="admin-field">
              <span>Название</span>
              <input
                value={uploadForm.title}
                onChange={(event) =>
                  setUploadForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Необязательное название"
                disabled={uploadingMedia}
              />
            </label>

            {selectedSection.slug === "video" ? (
              <label className="admin-checkbox-field">
                <input
                  type="checkbox"
                  checked={uploadForm.isFeatured}
                  onChange={(event) =>
                    setUploadForm((current) => ({ ...current, isFeatured: event.target.checked }))
                  }
                  disabled={uploadingMedia}
                />
                <span>Featured</span>
              </label>
            ) : null}

            <div className="upload-status-block">
              <div className="upload-status-row">
                <span className={`upload-status-pill is-${uploadStatus}`}>
                  {uploadStatusLabels[uploadStatus]}
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="upload-progress-track" aria-hidden="true">
                <div
                  className={`upload-progress-bar is-${uploadStatus}`}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>

            <div className="admin-modal-actions">
              <button type="button" className="secondary-link" onClick={() => setIsUploadOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="primary-link" disabled={uploadingMedia}>
                {uploadingMedia ? "Загрузка..." : "Upload"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}

function getMediaKind(file: File):
  | { value: "VIDEO"; sectionSlug: "video"; label: string }
  | { value: "IMAGE"; sectionSlug: "photo"; label: string }
  | null {
  if (file.type === "video/mp4" || file.type === "video/webm") {
    return { value: "VIDEO", sectionSlug: "video", label: "Видео" };
  }

  if (file.type === "image/jpeg" || file.type === "image/png") {
    return { value: "IMAGE", sectionSlug: "photo", label: "Изображения" };
  }

  return null;
}

async function readFileMetadata(
  file: File,
  kind: "VIDEO" | "IMAGE",
): Promise<{ width: number | null; height: number | null; durationSec: number | null }> {
  const objectUrl = URL.createObjectURL(file);

  try {
    if (kind === "IMAGE") {
      const image = await loadImage(objectUrl);
      return {
        width: image.naturalWidth,
        height: image.naturalHeight,
        durationSec: null,
      };
    }

    const video = await loadVideo(objectUrl);
    return {
      width: video.videoWidth,
      height: video.videoHeight,
      durationSec: Math.round(video.duration),
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Не удалось прочитать параметры изображения"));
    image.src = src;
  });
}

function loadVideo(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new Error("Не удалось прочитать параметры видео"));
    video.src = src;
  });
}

function uploadFileWithProgress(input: {
  file: File;
  onProgress: (progress: number) => void;
}): Promise<FileUploadResult> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    const request = new XMLHttpRequest();

    formData.append("file", input.file);

    request.open("POST", "/api/upload");
    request.responseType = "json";

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      input.onProgress(Math.min(Math.round((event.loaded / event.total) * 100), 100));
    };

    request.onerror = () => {
      reject(new Error("Ошибка загрузки файла"));
    };

    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        const errorMessage =
          typeof request.response === "object" &&
          request.response &&
          "error" in request.response &&
          typeof request.response.error === "string"
            ? request.response.error
            : "Ошибка загрузки файла";

        reject(new Error(errorMessage));
        return;
      }

      const response = request.response;

      if (
        !response ||
        typeof response !== "object" ||
        typeof response.publicUrl !== "string" ||
        typeof response.storageKey !== "string" ||
        typeof response.mimeType !== "string" ||
        typeof response.size !== "number"
      ) {
        reject(new Error("Ошибка загрузки файла"));
        return;
      }

      input.onProgress(100);
      resolve(response as FileUploadResult);
    };

    request.send(formData);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(durationSec: number | null): string {
  if (!durationSec) {
    return "Video";
  }

  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function translateAdminError(message: string): string {
  const translations: Record<string, string> = {
    "Section not found": "Раздел не найден",
    "Album slug already exists": "Альбом с таким slug уже существует",
    "Invalid album payload": "Некорректные данные альбома",
    "Album not found": "Альбом не найден",
    "Media not found": "Файл не найден",
    "Invalid media payload": "Некорректные данные файла",
    "Resource already exists": "Такой файл уже существует",
    "Failed to create media": "Не удалось создать файл",
    "Failed to delete media": "Не удалось удалить файл",
    "Failed to load album media": "Не удалось загрузить медиа",
  };

  return translations[message] ?? message;
}
