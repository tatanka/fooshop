# Product File Upload to R2 — Design

**Issue:** #3 [GEN-003] Product form: upload file su R2
**Date:** 2026-03-09
**Status:** Approved

## Summary

Product create/edit forms upload product files and cover images to Cloudflare R2 via presigned URLs. Reusable `FileDropZone` component + `useFileUpload` hook. Includes drag-and-drop, progress tracking, validation, and file replacement cleanup.

## Architecture

Two layers, cleanly separated:

- **`FileDropZone`** (`components/ui/file-drop-zone.tsx`) — Pure UI. Drag/drop, click-to-browse, file info + progress bar. Knows nothing about R2.
- **`useFileUpload`** (`hooks/use-file-upload.ts`) — App-specific hook. Calls `/api/upload` for presigned URL, uploads via XHR (for progress tracking), returns R2 key.

Product forms compose both.

## Data Flow

```
User drops file → FileDropZone calls onFileSelect(file)
  → Form calls useFileUpload.upload(file)
    → POST /api/upload → { uploadUrl, key }
    → XHR PUT to uploadUrl (tracks progress)
    → Returns R2 key
  → Form stores key in state (fileUrl / coverImageUrl)
  → On submit → POST/PUT /api/products with keys
```

## Bug Fix

`/api/products` POST route currently ignores `fileUrl` and `coverImageUrl`. Fix: accept and persist both fields in create and update handlers.

## Validation

| Check | Client | Server |
|-------|--------|--------|
| Product file size | 100 MB max | 413 on `/api/upload` |
| Cover image size | 5 MB max | 413 on `/api/upload` |
| Cover image type | `accept="image/*"` | — |
| Product file type | Open (any) | — |

## FileDropZone Props

```ts
interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;           // MIME filter (e.g., "image/*")
  maxSizeMB?: number;        // displayed in help text
  progress?: number;         // 0-100
  isUploading?: boolean;
  fileName?: string;         // current file name
  fileSize?: number;         // current file size in bytes
  error?: string;
  label: string;             // "Product file" or "Cover image"
}
```

## Edit Form

- Loads existing file info from DB (filename extracted from R2 key)
- Shows "Replace file" state when a file exists
- New upload triggers R2 cleanup of old file on save

## File Replacement Cleanup

On file replace (edit form), the PUT `/api/products/[id]` route deletes the old R2 object via `DeleteObjectCommand` before saving the new key. Product deletion does NOT delete R2 files (safety — storage is cheap, cleanup job can be added later).

## Error Handling

- Network failure during upload → error state, user can retry
- Presigned URL expired → re-request on retry
- File too large → client-side rejection + server-side 413 backup

## Decisions

- **Open file types** for products (diverse marketplace)
- **100 MB** product file limit, **5 MB** cover image limit
- **XHR** for upload (fetch doesn't support upload progress)
- **Immediate cleanup** only on file replacement, not product deletion
- **Generic drop zone + app-specific hook** separation
