"use client";

import { useCallback, useRef, useState } from "react";

interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
  progress?: number;
  isUploading?: boolean;
  fileName?: string | null;
  fileSize?: number | null;
  error?: string | null;
  label: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDropZone({
  onFileSelect,
  accept,
  maxSizeMB,
  progress = 0,
  isUploading = false,
  fileName,
  fileSize,
  error,
  label,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
      // Reset input so same file can be re-selected
      e.target.value = "";
    },
    [onFileSelect]
  );

  const hasFile = !!fileName;

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleClick();
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center
          w-full min-h-[140px] border-2 border-dashed rounded-lg p-6
          cursor-pointer transition-colors
          ${isDragging ? "border-black bg-gray-50" : "border-gray-300 hover:border-gray-400"}
          ${error ? "border-red-400 bg-red-50" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />

        {isUploading ? (
          <div className="w-full space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span className="truncate max-w-[200px]">{fileName}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-black h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            {fileSize && (
              <p className="text-xs text-gray-500">{formatBytes(fileSize)}</p>
            )}
          </div>
        ) : hasFile ? (
          <div className="text-center space-y-1">
            <p className="text-sm font-medium truncate max-w-[300px]">{fileName}</p>
            {fileSize && (
              <p className="text-xs text-gray-500">{formatBytes(fileSize)}</p>
            )}
            <p className="text-xs text-gray-400">Click or drop to replace</p>
          </div>
        ) : (
          <div className="text-center space-y-1">
            <p className="text-sm text-gray-600">
              Drop file here or <span className="underline">browse</span>
            </p>
            {maxSizeMB && (
              <p className="text-xs text-gray-400">Max {maxSizeMB} MB</p>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
