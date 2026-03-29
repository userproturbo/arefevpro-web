"use client";

import { useState } from "react";

type UploadResponse = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
};

type UploadErrorResponse = {
  error: string;
};

export default function TestUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) {
      setError("Select a file first.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadedFileUrl(null);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
        }),
      });

      const data = (await response.json()) as UploadResponse | UploadErrorResponse;

      if (!response.ok) {
        const message =
          "error" in data ? data.error : "Failed to prepare file upload.";

        throw new Error(message);
      }

      if (!("uploadUrl" in data)) {
        throw new Error("Invalid upload response.");
      }

      const uploadResponse = await fetch(data.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage.");
      }

      setUploadedFileUrl(data.publicUrl);
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Unexpected upload error.";

      setError(message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main>
      <h1>Test Upload</h1>
      <input
        type="file"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />
      <button type="button" onClick={handleUpload} disabled={!file || isUploading}>
        {isUploading ? "Uploading..." : "Upload"}
      </button>
      {error ? <p>{error}</p> : null}
      {uploadedFileUrl ? (
        <p>
          Uploaded:{" "}
          <a href={uploadedFileUrl} target="_blank" rel="noreferrer">
            {uploadedFileUrl}
          </a>
        </p>
      ) : null}
    </main>
  );
}
