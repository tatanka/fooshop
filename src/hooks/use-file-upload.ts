"use client";

import { useState, useCallback, useRef } from "react";

interface UploadState {
  progress: number;
  isUploading: boolean;
  error: string | null;
  key: string | null;
  fileName: string | null;
  fileSize: number | null;
}

interface UseFileUploadOptions {
  maxSizeMB: number;
  purpose?: "file" | "cover";
}

export function useFileUpload({ maxSizeMB, purpose = "file" }: UseFileUploadOptions) {
  const [state, setState] = useState<UploadState>({
    progress: 0,
    isUploading: false,
    error: null,
    key: null,
    fileName: null,
    fileSize: null,
  });
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        setState((s) => ({
          ...s,
          error: `File too large. Maximum size is ${maxSizeMB} MB.`,
        }));
        return null;
      }

      setState({
        progress: 0,
        isUploading: true,
        error: null,
        key: null,
        fileName: file.name,
        fileSize: file.size,
      });

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            purpose: purpose === "cover" ? "cover" : "file",
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to get upload URL");
        }

        const { uploadUrl, key } = await res.json();

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhrRef.current = xhr;

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setState((s) => ({ ...s, progress: pct }));
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener("error", () => reject(new Error("Upload failed")));
          xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
          xhr.send(file);
        });

        setState((s) => ({
          ...s,
          isUploading: false,
          progress: 100,
          key,
        }));

        return key;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setState((s) => ({
          ...s,
          isUploading: false,
          error: message,
        }));
        return null;
      } finally {
        xhrRef.current = null;
      }
    },
    [maxSizeMB, purpose]
  );

  const cancel = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    cancel();
    setState({
      progress: 0,
      isUploading: false,
      error: null,
      key: null,
      fileName: null,
      fileSize: null,
    });
  }, [cancel]);

  return { ...state, upload, cancel, reset };
}
