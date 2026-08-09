"use client";

import { useRef, useState } from "react";

// Uploads an image to Supabase Storage (via /api/upload) and surfaces the
// resulting public URL. The URL lives in a named text input so it submits with
// the surrounding form; it can also be pasted/edited by hand.
export function ImageUploader({
  name,
  label,
  kind,
  value,
  onChange,
  clientId,
}: {
  name?: string;
  label: string;
  kind: string;
  value: string;
  onChange: (url: string) => void;
  /** When set (agency admin editing a client), upload targets that client. */
  clientId?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    if (clientId) fd.append("client_id", clientId);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Upload failed.");
      onChange(body.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-start gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={label}
            className="h-16 w-16 shrink-0 rounded-lg border border-gray-200 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-400">
            None
          </div>
        )}
        <div className="flex-1 space-y-2">
          <input
            type="text"
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://... or upload →"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {uploading ? "Uploading..." : "Upload image"}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-sm text-gray-400 hover:text-red-600"
              >
                Remove
              </button>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}

// Upload helper that doesn't bind to a form field — it just gives you a URL to
// copy and paste (used for gallery / service JSON).
export function ImageUrlHelper({ kind, label, clientId }: { kind: string; label: string; clientId?: string }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
      <ImageUploader name={undefined} label={label} kind={kind} value={url} onChange={setUrl} clientId={clientId} />
      {url && (
        <button
          type="button"
          onClick={copy}
          className="mt-2 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
        >
          {copied ? "Copied!" : "Copy URL"}
        </button>
      )}
    </div>
  );
}
