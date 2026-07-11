"use client";

import { useState } from "react";

// Copies a tracked review link to the clipboard with quick visual feedback.
export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — silently ignore.
    }
  }

  return (
    <button
      onClick={copy}
      title={url}
      className="inline-flex items-center gap-1 rounded-md border border-[#e0e0de] bg-white px-2 py-1 text-xs font-medium text-[#5f5e5b] transition-colors hover:border-brand/40 hover:text-brand"
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
