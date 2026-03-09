# Product File Upload to R2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Product create/edit forms upload files to R2 with drag-and-drop, progress tracking, validation, and file replacement cleanup.

**Architecture:** Generic `FileDropZone` UI component + `useFileUpload` hook. The hook handles presigned URL flow and progress via XHR. Forms compose both. API routes fixed to persist file keys.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, @aws-sdk/client-s3, XHR for upload progress

---

### Task 1: Add `deleteObject` helper to R2 lib

**Files:**
- Modify: `src/lib/r2.ts`

**Step 1: Add DeleteObjectCommand import and helper**

In `src/lib/r2.ts`, add `DeleteObjectCommand` to the import and add:

```ts
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
```

Then add at the end of the file:

```ts
export async function deleteObject(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  });
  await r2.send(command);
}
```

**Step 2: Commit**

```bash
git add src/lib/r2.ts
git commit -m "feat: add deleteObject helper to R2 lib"
```

---

### Task 2: Fix products API to persist file URLs

**Files:**
- Modify: `src/app/api/products/route.ts:42-53`
- Modify: `src/app/api/products/[id]/route.ts:59-64`

**Step 1: Fix POST handler to include fileUrl and coverImageUrl**

In `src/app/api/products/route.ts`, update the `.values()` call (lines 44-52) to include file fields:

```ts
  const [product] = await db
    .insert(products)
    .values({
      creatorId: creator.id,
      title: body.title,
      slug,
      description: body.description,
      priceCents: body.priceCents,
      category: body.category,
      status: body.status ?? "published",
      fileUrl: body.fileUrl ?? null,
      coverImageUrl: body.coverImageUrl ?? null,
    })
    .returning();
```

**Step 2: Fix PUT handler to clean up replaced R2 files**

In `src/app/api/products/[id]/route.ts`, update the PUT handler. Add import for `deleteObject`:

```ts
import { deleteObject } from "@/lib/r2";
```

Replace the existing body/update logic (lines 59-64) with:

```ts
  const body = await req.json();

  // Fetch current product to check for file replacement
  const [current] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.creatorId, creator.id)));

  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Clean up old R2 files if being replaced
  if (body.fileUrl && current.fileUrl && body.fileUrl !== current.fileUrl) {
    await deleteObject(current.fileUrl).catch(() => {});
  }
  if (body.coverImageUrl && current.coverImageUrl && body.coverImageUrl !== current.coverImageUrl) {
    await deleteObject(current.coverImageUrl).catch(() => {});
  }

  const [updated] = await db
    .update(products)
    .set(body)
    .where(and(eq(products.id, id), eq(products.creatorId, creator.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
```

**Step 3: Commit**

```bash
git add src/app/api/products/route.ts src/app/api/products/[id]/route.ts
git commit -m "fix: persist fileUrl and coverImageUrl in product API, cleanup replaced files"
```

---

### Task 3: Add file size validation to upload API

**Files:**
- Modify: `src/app/api/upload/route.ts`

**Step 1: Add size validation**

Update `src/app/api/upload/route.ts` to accept and validate a `maxSizeMB` context:

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUploadUrl } from "@/lib/r2";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE_MB = 100;
const MAX_COVER_SIZE_MB = 5;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename, contentType, purpose } = await req.json();

  const maxMB = purpose === "cover" ? MAX_COVER_SIZE_MB : MAX_FILE_SIZE_MB;

  const key = `products/${session.user.id}/${randomUUID()}/${filename}`;
  const uploadUrl = await getUploadUrl(key, contentType);

  return NextResponse.json({ uploadUrl, key, maxSizeBytes: maxMB * 1024 * 1024 });
}
```

**Step 2: Commit**

```bash
git add src/app/api/upload/route.ts
git commit -m "feat: add file size limits to upload API response"
```

---

### Task 4: Create `useFileUpload` hook

**Files:**
- Create: `src/hooks/use-file-upload.ts`

**Step 1: Create the hook**

```ts
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
```

**Step 2: Commit**

```bash
git add src/hooks/use-file-upload.ts
git commit -m "feat: add useFileUpload hook with progress tracking and validation"
```

---

### Task 5: Create `FileDropZone` component

**Files:**
- Create: `src/components/ui/file-drop-zone.tsx`

**Step 1: Create the component**

```tsx
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
```

**Step 2: Commit**

```bash
mkdir -p src/components/ui
git add src/components/ui/file-drop-zone.tsx
git commit -m "feat: add FileDropZone component with drag-and-drop and progress bar"
```

---

### Task 6: Rewrite product create form with FileDropZone

**Files:**
- Modify: `src/app/(platform)/dashboard/products/new/page.tsx`

**Step 1: Rewrite the form**

Replace the entire file with:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { useFileUpload } from "@/hooks/use-file-upload";

const CATEGORIES = [
  "templates",
  "presets",
  "luts",
  "prompts",
  "guides",
  "courses",
  "assets",
  "other",
];

const CATEGORY_LABELS: Record<string, string> = { luts: "LUTs" };
function categoryLabel(cat: string) {
  return CATEGORY_LABELS[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1);
}

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceCents, setPriceCents] = useState("");
  const [category, setCategory] = useState("templates");

  const fileUpload = useFileUpload({ maxSizeMB: 100, purpose: "file" });
  const coverUpload = useFileUpload({ maxSizeMB: 5, purpose: "cover" });

  async function handleFileSelect(file: File) {
    await fileUpload.upload(file);
  }

  async function handleCoverSelect(file: File) {
    await coverUpload.upload(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const price = Math.round(parseFloat(priceCents) * 100);
      if (isNaN(price) || price <= 0) {
        throw new Error("Invalid price");
      }

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          priceCents: price,
          category,
          fileUrl: fileUpload.key,
          coverImageUrl: coverUpload.key,
        }),
      });

      if (!res.ok) throw new Error("Failed to create product");

      router.push("/dashboard/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const isSubmitting = loading || fileUpload.isUploading || coverUpload.isUploading;

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold">New Product</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-black resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Price (USD)</label>
          <input
            type="text"
            inputMode="decimal"
            value={priceCents}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
                setPriceCents(val);
              }
            }}
            placeholder="9.99"
            required
            className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-black"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {categoryLabel(cat)}
              </option>
            ))}
          </select>
        </div>

        <FileDropZone
          label="Product File"
          onFileSelect={handleFileSelect}
          maxSizeMB={100}
          progress={fileUpload.progress}
          isUploading={fileUpload.isUploading}
          fileName={fileUpload.fileName}
          fileSize={fileUpload.fileSize}
          error={fileUpload.error}
        />

        <FileDropZone
          label="Cover Image"
          onFileSelect={handleCoverSelect}
          accept="image/*"
          maxSizeMB={5}
          progress={coverUpload.progress}
          isUploading={coverUpload.isUploading}
          fileName={coverUpload.fileName}
          fileSize={coverUpload.fileSize}
          error={coverUpload.error}
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-black text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create Product"}
          </button>
          <a
            href="/dashboard/products"
            className="border px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </a>
        </div>
      </form>
    </main>
  );
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: No build errors.

**Step 3: Commit**

```bash
git add src/app/\(platform\)/dashboard/products/new/page.tsx
git commit -m "feat: rewrite product create form with FileDropZone and useFileUpload"
```

---

### Task 7: Add file upload to product edit form

**Files:**
- Modify: `src/app/(platform)/dashboard/products/[id]/edit/page.tsx`

**Step 1: Rewrite the edit form**

Replace the entire file with:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { useFileUpload } from "@/hooks/use-file-upload";

const CATEGORIES = [
  "templates",
  "presets",
  "luts",
  "prompts",
  "guides",
  "courses",
  "assets",
  "other",
];

const CATEGORY_LABELS: Record<string, string> = { luts: "LUTs" };
function categoryLabel(cat: string) {
  return CATEGORY_LABELS[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1);
}

function filenameFromKey(key: string | null): string | null {
  if (!key) return null;
  const parts = key.split("/");
  return parts[parts.length - 1] || null;
}

export default function EditProductPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceCents, setPriceCents] = useState("");
  const [category, setCategory] = useState("templates");
  const [status, setStatus] = useState("published");

  // Existing file info from DB
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);

  const fileUpload = useFileUpload({ maxSizeMB: 100, purpose: "file" });
  const coverUpload = useFileUpload({ maxSizeMB: 5, purpose: "cover" });

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Product not found");
        return res.json();
      })
      .then((product) => {
        setTitle(product.title);
        setDescription(product.description);
        setPriceCents((product.priceCents / 100).toFixed(2));
        setCategory(product.category);
        setStatus(product.status);
        setExistingFileUrl(product.fileUrl);
        setExistingCoverUrl(product.coverImageUrl);
      })
      .catch(() => setError("Failed to load product"))
      .finally(() => setFetching(false));
  }, [id]);

  async function handleFileSelect(file: File) {
    await fileUpload.upload(file);
  }

  async function handleCoverSelect(file: File) {
    await coverUpload.upload(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const price = Math.round(parseFloat(priceCents) * 100);
      if (isNaN(price) || price <= 0) {
        throw new Error("Invalid price");
      }

      const body: Record<string, unknown> = {
        title,
        description,
        priceCents: price,
        category,
        status,
      };

      // Only send file URLs if new files were uploaded
      if (fileUpload.key) {
        body.fileUrl = fileUpload.key;
      }
      if (coverUpload.key) {
        body.coverImageUrl = coverUpload.key;
      }

      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to update product");

      router.push("/dashboard/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12">
        <p className="text-gray-400">Loading...</p>
      </main>
    );
  }

  const isSubmitting = loading || fileUpload.isUploading || coverUpload.isUploading;

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold">Edit Product</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-black resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Price (USD)</label>
          <input
            type="text"
            inputMode="decimal"
            value={priceCents}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
                setPriceCents(val);
              }
            }}
            placeholder="9.99"
            required
            className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-black"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {categoryLabel(cat)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <FileDropZone
          label="Product File"
          onFileSelect={handleFileSelect}
          maxSizeMB={100}
          progress={fileUpload.progress}
          isUploading={fileUpload.isUploading}
          fileName={fileUpload.fileName ?? filenameFromKey(existingFileUrl)}
          fileSize={fileUpload.fileSize}
          error={fileUpload.error}
        />

        <FileDropZone
          label="Cover Image"
          onFileSelect={handleCoverSelect}
          accept="image/*"
          maxSizeMB={5}
          progress={coverUpload.progress}
          isUploading={coverUpload.isUploading}
          fileName={coverUpload.fileName ?? filenameFromKey(existingCoverUrl)}
          fileSize={coverUpload.fileSize}
          error={coverUpload.error}
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-black text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
          <a
            href="/dashboard/products"
            className="border px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </a>
        </div>
      </form>
    </main>
  );
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: No build errors.

**Step 3: Commit**

```bash
git add src/app/\(platform\)/dashboard/products/\[id\]/edit/page.tsx
git commit -m "feat: add file upload with FileDropZone to product edit form"
```

---

### Task 8: Final build verification

**Step 1: Full build**

Run: `pnpm build`
Expected: Clean build, no errors.

**Step 2: Manual smoke test checklist**

- [ ] Navigate to `/dashboard/products/new`
- [ ] Drop a file on the product file zone — progress bar shows, key stored
- [ ] Drop an image on cover image zone — progress bar shows, key stored
- [ ] Submit form — product created with both file URLs in DB
- [ ] Edit the product — existing file names shown in drop zones
- [ ] Replace product file on edit — old file cleaned up from R2
- [ ] Try uploading a file > 100 MB — client-side error shown
- [ ] Try uploading a cover image > 5 MB — client-side error shown

**Step 3: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address smoke test issues"
```
