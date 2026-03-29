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
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [albumMessage, setAlbumMessage] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    if (!selectedFile || !selectedFile.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(nextPreviewUrl);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [selectedFile]);

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
        throw new Error(("error" in payload && payload.error) || "Failed to create album");
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
      setAlbumMessage(`Album created: ${createdAlbum.title}`);
    } catch (error) {
      setAlbumMessage(error instanceof Error ? error.message : "Failed to create album");
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
      setUploadMessage("Choose a file to upload");
      return;
    }

    const selectedAlbum = albums.find((album) => album.id === uploadForm.albumId);

    if (!selectedAlbum) {
      setUploadStatus("error");
      setUploadMessage("Choose an album");
      return;
    }

    const kind = getMediaKind(selectedFile);

    if (!kind) {
      setUploadStatus("error");
      setUploadMessage("Only MP4, WEBM, JPEG, and PNG files are supported");
      return;
    }

    if (selectedAlbum.sectionSlug !== kind.sectionSlug) {
      setUploadStatus("error");
      setUploadMessage(
        `${kind.label} files can only be uploaded to ${kind.sectionSlug.toUpperCase()} albums`,
      );
      return;
    }

    setUploadingMedia(true);
    setUploadProgress(0);
    setUploadStatus("uploading");
    setUploadMessage(null);

    try {
      const uploadPrepResponse = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
        }),
      });

      const uploadPrepPayload = (await uploadPrepResponse.json()) as
        | {
            uploadUrl: string;
            publicUrl: string;
            key: string;
          }
        | { error?: string };

      if (!uploadPrepResponse.ok || !("uploadUrl" in uploadPrepPayload)) {
        throw new Error(
          ("error" in uploadPrepPayload && uploadPrepPayload.error) || "Failed to prepare upload",
        );
      }

      await uploadFileWithProgress({
        file: selectedFile,
        contentType: selectedFile.type,
        uploadUrl: uploadPrepPayload.uploadUrl,
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
          storageKey: uploadPrepPayload.key,
          publicUrl: uploadPrepPayload.publicUrl,
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
        throw new Error(("error" in mediaPayload && mediaPayload.error) || "Failed to create media");
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
      setUploadStatus("success");
      setUploadProgress(100);
      setUploadMessage(`Uploaded to ${selectedAlbum.title}`);
    } catch (error) {
      setUploadStatus("error");
      setUploadMessage(error instanceof Error ? error.message : "Failed to upload media");
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
    setUploadStatus("idle");
    setUploadProgress(0);
    setUploadMessage(null);
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Content Control</h1>
          <p className="admin-copy">
            Create published albums, upload media, and verify the catalog without leaving the app.
          </p>
        </div>
      </header>

      <section className="admin-grid">
        <form className="admin-panel-card" onSubmit={handleCreateAlbum}>
          <div className="admin-panel-head">
            <h2>Create Album</h2>
            <p>Published immediately so it appears in the public sections.</p>
          </div>

          <label className="admin-field">
            <span>Title</span>
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
              placeholder="showreel"
            />
          </label>

          <label className="admin-field">
            <span>Section</span>
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
                  {section.title.toUpperCase()}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-field">
            <span>Description</span>
            <textarea
              value={albumForm.description}
              onChange={(event) =>
                setAlbumForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Selected cinematic works"
              rows={4}
            />
          </label>

          <button type="submit" className="primary-link admin-submit" disabled={creatingAlbum}>
            {creatingAlbum ? "Creating..." : "Create Album"}
          </button>

          {albumMessage ? <p className="admin-feedback">{albumMessage}</p> : null}
        </form>

        <form className="admin-panel-card" onSubmit={handleUploadMedia}>
          <div className="admin-panel-head">
            <h2>Upload + Create Media</h2>
            <p>Uses the existing presigned upload flow, then creates the database record.</p>
          </div>

          <div className="admin-field">
            <span>File</span>
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
                <strong>Drag and drop a file</strong>
                <span>or click to browse</span>
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
            <span>Album</span>
            <select
              value={uploadForm.albumId}
              onChange={(event) =>
                setUploadForm((current) => ({ ...current, albumId: event.target.value }))
              }
              disabled={uploadingMedia}
            >
              {albumOptions.map((album) => (
                <option key={album.id} value={album.id}>
                  {album.label}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-field">
            <span>Title</span>
            <input
              value={uploadForm.title}
              onChange={(event) =>
                setUploadForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Optional title"
              disabled={uploadingMedia}
            />
          </label>

          <div className="upload-status-block">
            <div className="upload-status-row">
              <span className={`upload-status-pill is-${uploadStatus}`}>{uploadStatus}</span>
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
            {uploadingMedia ? "Uploading..." : "Upload Media"}
          </button>

          {uploadMessage ? <p className="admin-feedback">{uploadMessage}</p> : null}
        </form>
      </section>

      <section className="admin-list-card">
        <div className="admin-panel-head">
          <h2>Albums</h2>
          <p>Current catalog across video and photo sections.</p>
        </div>

        <div className="admin-album-list">
          {albums.map((album) => (
            <div key={album.id} className="admin-album-row">
              <div>
                <strong>{album.title}</strong>
                <p>{album.slug}</p>
              </div>
              <div className="admin-album-meta">
                <span>{album.sectionSlug.toUpperCase()}</span>
                <span>{album.itemCount} items</span>
                <span>{album.isPublished ? "Published" : "Draft"}</span>
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
  | { value: "VIDEO"; sectionSlug: "video"; label: "Video" }
  | { value: "IMAGE"; sectionSlug: "photo"; label: "Image" }
  | null {
  if (file.type === "video/mp4" || file.type === "video/webm") {
    return { value: "VIDEO", sectionSlug: "video", label: "Video" };
  }

  if (file.type === "image/jpeg" || file.type === "image/png") {
    return { value: "IMAGE", sectionSlug: "photo", label: "Image" };
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
    image.onerror = () => reject(new Error("Failed to read image metadata"));
    image.src = src;
  });
}

function loadVideo(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new Error("Failed to read video metadata"));
    video.src = src;
  });
}

function uploadFileWithProgress(input: {
  uploadUrl: string;
  file: File;
  contentType: string;
  onProgress: (progress: number) => void;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", input.uploadUrl);
    xhr.setRequestHeader("Content-Type", input.contentType);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      input.onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        input.onProgress(100);
        resolve();
        return;
      }

      reject(new Error("Upload to storage failed"));
    };

    xhr.onerror = () => reject(new Error("Upload to storage failed"));
    xhr.send(input.file);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
