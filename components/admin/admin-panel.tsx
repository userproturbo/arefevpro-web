"use client";

import { useMemo, useState } from "react";
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
  const [albumMessage, setAlbumMessage] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

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

    if (!selectedFile) {
      setUploadMessage("Choose a file to upload");
      return;
    }

    const selectedAlbum = albums.find((album) => album.id === uploadForm.albumId);

    if (!selectedAlbum) {
      setUploadMessage("Choose an album");
      return;
    }

    const kind = getMediaKind(selectedFile);

    if (!kind) {
      setUploadMessage("Only MP4, WEBM, JPEG, and PNG files are supported");
      return;
    }

    if (selectedAlbum.sectionSlug !== kind.sectionSlug) {
      setUploadMessage(
        `${kind.label} files can only be uploaded to ${kind.sectionSlug.toUpperCase()} albums`,
      );
      return;
    }

    setUploadingMedia(true);
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

      await fetch(uploadPrepPayload.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": selectedFile.type,
        },
        body: selectedFile,
      }).then((response) => {
        if (!response.ok) {
          throw new Error("Upload to storage failed");
        }
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
      setSelectedFile(null);
      setUploadForm((current) => ({
        ...current,
        title: "",
      }));
      setUploadMessage(`Uploaded to ${selectedAlbum.title}`);
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Failed to upload media");
    } finally {
      setUploadingMedia(false);
    }
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

          <label className="admin-field">
            <span>File</span>
            <input
              type="file"
              accept="video/mp4,video/webm,image/jpeg,image/png"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <label className="admin-field">
            <span>Album</span>
            <select
              value={uploadForm.albumId}
              onChange={(event) =>
                setUploadForm((current) => ({ ...current, albumId: event.target.value }))
              }
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
            />
          </label>

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
