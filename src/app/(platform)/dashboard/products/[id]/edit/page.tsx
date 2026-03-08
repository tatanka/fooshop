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
