"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AlbumCard } from "@/lib/services/albums";
import type { SectionSummary } from "@/lib/services/sections";

type AdminPanelProps = {
  initialAlbums: AlbumCard[];
  sections: SectionSummary[];
};

type AlbumFormState = {
  title: string;
  slug: string;
  section: "video" | "photo";
  description: string;
};

type UploadFormState = {
  albumId: string;
  title: string;
};

type UploadStatus = "idle" | "uploading" | "success" | "error";

const uploadStatusLabels: Record<UploadStatus, string> = {
  idle: "Ожидание",
  uploading: "Загрузка",
  success: "Успешно",
  error: "Ошибка",
};

const sectionLabels: Record<string, string> = {
  video: "Видео",
  photo: "Фото",
};

export function AdminPanel({ initialAlbums, sections }: AdminPanelProps) {
  const [albums, setAlbums] = useState(initialAlbums);
  const [albumForm, setAlbumForm] = useState<AlbumFormState>({
    title: "",
    slug: "",
    section: "video",
    description: "",
  });
  const [uploadForm, setUploadForm] = useState<UploadFormState>({
    albumId: initialAlbums[0]?.id ?? "",
    title: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lastCreatedMedia, setLastCreatedMedia] = useState<{
    kind: "VIDEO" | "IMAGE";
    title: string;
    publicUrl: string;
  } | null>(null);
  const [albumMessage, setAlbumMessage] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlsRef = useRef<string[]>([]);

  const editableSections = sections.filter(
    (section) => section.slug === "video" || section.slug === "photo",
  );

  const albumOptions = useMemo(
    () =>
      albums.map((album) => ({
        ...album,
        label: `${album.title} · ${album.sectionSlug.toUpperCase()}`,
      })),
    [albums],
  );

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
          slug: albumForm.slug,
          sectionSlug: albumForm.section,
          description: albumForm.description || undefined,
          isPublished: true,
        }),
      });

      const payload = (await response.json()) as AlbumCard | { error?: string };

      if (!response.ok || "error" in payload) {
        throw new Error(
          translateAdminError(("error" in payload && payload.error) || "Не удалось создать альбом"),
        );
      }

      const createdAlbum = payload as AlbumCard;
      setAlbums((current) => sortAlbums([createdAlbum, ...current]));
      setUploadForm((current) => ({
        ...current,
        albumId: createdAlbum.id,
      }));
      setAlbumForm({
        title: "",
        slug: "",
        section: albumForm.section,
        description: "",
      });
      setAlbumMessage(`Альбом создан: ${createdAlbum.title}`);
    } catch (error) {
      setAlbumMessage(error instanceof Error ? error.message : "Не удалось создать альбом");
    } finally {
      setCreatingAlbum(false);
    }
  }

  async function handleUploadMedia(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (uploadingMedia) {
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

    const selectedAlbum = albums.find((album) => album.id === uploadForm.albumId);

    if (!selectedAlbum) {
      setUploadStatus("error");
      setUploadMessage("Выберите альбом");
      return;
    }

    const kind = getMediaKind(selectedFile);

    if (!kind) {
      setUploadStatus("error");
      setUploadMessage("Поддерживаются только файлы MP4, WEBM, JPEG и PNG");
      return;
    }

    if (selectedAlbum.sectionSlug !== kind.sectionSlug) {
      setUploadStatus("error");
      setUploadMessage(
        `${kind.label} можно загружать только в альбомы раздела ${kind.sectionSlug.toUpperCase()}`,
      );
      return;
    }

    setUploadingMedia(true);
    setUploadProgress(0);
    setUploadStatus("uploading");
    setUploadMessage(null);

    try {
      const mockedUpload = await mockUploadWithProgress({
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
          storageKey: mockedUpload.storageKey,
          publicUrl: selectedFileUrl,
          mimeType: selectedFile.type,
          sizeBytes: selectedFile.size,
          width: metadata.width,
          height: metadata.height,
          durationSec: metadata.durationSec,
          albumId: selectedAlbum.id,
          title: uploadForm.title || selectedFile.name.replace(/\.[^.]+$/, ""),
          isPublished: true,
        }),
      });

      const mediaPayload = (await mediaCreateResponse.json()) as
        | { error?: string }
        | {
            mediaFile: { id: string };
            video: { id: string } | null;
          };

      if (!mediaCreateResponse.ok || "error" in mediaPayload) {
        throw new Error(
          translateAdminError(("error" in mediaPayload && mediaPayload.error) || "Не удалось создать файл"),
        );
      }

      setAlbums((current) =>
        current.map((album) =>
          album.id === selectedAlbum.id
            ? { ...album, itemCount: album.itemCount + 1 }
            : album,
        ),
      );
      setUploadForm((current) => ({
        ...current,
        title: "",
      }));
      setLastCreatedMedia({
        kind: kind.value,
        title: uploadForm.title || selectedFile.name.replace(/\.[^.]+$/, ""),
        publicUrl: selectedFileUrl,
      });
      setUploadStatus("success");
      setUploadProgress(100);
      setUploadMessage(`Файл добавлен в альбом «${selectedAlbum.title}»`);
    } catch (error) {
      setUploadStatus("error");
      setUploadMessage(error instanceof Error ? error.message : "Ошибка загрузки файла");
    } finally {
      setUploadingMedia(false);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragActive(false);

    if (uploadingMedia) {
      return;
    }

    const file = event.dataTransfer.files?.[0] ?? null;
    setSelectedUploadFile(file);
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
    setUploadMessage(null);
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Панель</p>
          <h1>Управление контентом</h1>
          <p className="admin-copy">
            Создавайте альбомы, добавляйте файлы и сразу проверяйте каталог прямо в приложении.
          </p>
        </div>
      </header>

      <section className="admin-grid">
        <form className="admin-panel-card" onSubmit={handleCreateAlbum}>
          <div className="admin-panel-head">
            <h2>Создать альбом</h2>
            <p>Альбом публикуется сразу и появляется в публичных разделах.</p>
          </div>

          <label className="admin-field">
            <span>Название</span>
            <input
              value={albumForm.title}
              onChange={(event) =>
                setAlbumForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Шоурил"
            />
          </label>

          <label className="admin-field">
            <span>Slug</span>
            <input
              value={albumForm.slug}
              onChange={(event) =>
                setAlbumForm((current) => ({ ...current, slug: event.target.value }))
              }
              placeholder="showreel"
            />
          </label>

          <label className="admin-field">
            <span>Раздел</span>
            <select
              value={albumForm.section}
              onChange={(event) =>
                setAlbumForm((current) => ({
                  ...current,
                  section: event.target.value as "video" | "photo",
                }))
              }
            >
              {editableSections.map((section) => (
                <option key={section.id} value={section.slug}>
                  {sectionLabels[section.slug] ?? section.title}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-field">
            <span>Описание</span>
            <textarea
              value={albumForm.description}
              onChange={(event) =>
                setAlbumForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Избранные кинематографичные работы"
              rows={4}
            />
          </label>

          <button type="submit" className="primary-link admin-submit" disabled={creatingAlbum}>
            {creatingAlbum ? "Создание..." : "Создать альбом"}
          </button>

          {albumMessage ? <p className="admin-feedback">{albumMessage}</p> : null}
        </form>

        <form className="admin-panel-card" onSubmit={handleUploadMedia}>
          <div className="admin-panel-head">
            <h2>Загрузка файла</h2>
            <p>Для локальной разработки загрузка в хранилище замокана, затем создаётся запись в базе.</p>
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
              onDrop={handleDrop}
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
            <span>Альбом</span>
            <select
              value={uploadForm.albumId}
              onChange={(event) =>
                setUploadForm((current) => ({ ...current, albumId: event.target.value }))
              }
              disabled={uploadingMedia}
            >
              {albumOptions.map((album) => (
                <option key={album.id} value={album.id}>
                  {album.title} · {sectionLabels[album.sectionSlug] ?? album.sectionSlug}
                </option>
              ))}
            </select>
          </label>

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

          <button type="submit" className="primary-link admin-submit" disabled={uploadingMedia}>
            {uploadingMedia ? "Загрузка..." : "Загрузить файл"}
          </button>

          {uploadMessage ? <p className="admin-feedback">{uploadMessage}</p> : null}

          {lastCreatedMedia ? (
            <div className="upload-result-card">
              <div className="upload-result-copy">
                <strong>Последний загруженный файл</strong>
                <span>{lastCreatedMedia.title}</span>
              </div>

              {lastCreatedMedia.kind === "IMAGE" ? (
                <img
                  src={lastCreatedMedia.publicUrl}
                  alt={lastCreatedMedia.title}
                  className="upload-result-image"
                />
              ) : (
                <video
                  src={lastCreatedMedia.publicUrl}
                  className="upload-result-video"
                  controls
                  playsInline
                />
              )}
            </div>
          ) : null}
        </form>
      </section>

      <section className="admin-list-card">
        <div className="admin-panel-head">
          <h2>Альбомы</h2>
          <p>Текущий каталог по разделам видео и фото.</p>
        </div>

        <div className="admin-album-list">
          {albums.map((album) => (
            <div key={album.id} className="admin-album-row">
              <div>
                <strong>{album.title}</strong>
                <p>{album.slug}</p>
              </div>
              <div className="admin-album-meta">
                <span>{sectionLabels[album.sectionSlug] ?? album.sectionSlug}</span>
                <span>{album.itemCount} файлов</span>
                <span>{album.isPublished ? "Опубликован" : "Черновик"}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function sortAlbums(albums: AlbumCard[]): AlbumCard[] {
  return [...albums].sort((left, right) => {
    if (left.sectionSlug !== right.sectionSlug) {
      return left.sectionSlug.localeCompare(right.sectionSlug);
    }

    return left.title.localeCompare(right.title);
  });
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

function mockUploadWithProgress(input: {
  file: File;
  onProgress: (progress: number) => void;
}): Promise<{ storageKey: string }> {
  return new Promise((resolve, reject) => {
    let progress = 0;
    const intervalId = window.setInterval(() => {
      progress = Math.min(progress + 12, 96);
      input.onProgress(progress);
    }, 90);

    window.setTimeout(() => {
      window.clearInterval(intervalId);

      try {
        const normalizedName = input.file.name
          .normalize("NFKD")
          .replace(/[^\w.-]+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "") || "file";

        input.onProgress(100);
        resolve({
          storageKey: `mock/local/${Date.now()}-${normalizedName}`,
        });
      } catch {
        reject(new Error("Ошибка загрузки файла"));
      }
    }, 900);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function translateAdminError(message: string): string {
  const translations: Record<string, string> = {
    "Section not found": "Раздел не найден",
    "Album slug already exists": "Альбом с таким slug уже существует",
    "Invalid album payload": "Некорректные данные альбома",
    "Album not found": "Альбом не найден",
    "Invalid media payload": "Некорректные данные файла",
    "Resource already exists": "Такой файл уже существует",
    "Failed to create media": "Не удалось создать файл",
  };

  return translations[message] ?? message;
}
