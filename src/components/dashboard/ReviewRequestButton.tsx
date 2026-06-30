"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

// Generates a prefilled review-request message and lets the user copy it or
// open their SMS app. The message + link are built server-side and passed in.
export function ReviewRequestButton({
  message,
  smsHref,
  hasReviewLink,
}: {
  message: string;
  smsHref: string;
  hasReviewLink: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!hasReviewLink) {
    return (
      <p className="text-sm text-gray-500">
        Add your Google review link in{" "}
        <a href="/dashboard/settings" className="font-medium text-brand underline">
          Settings
        </a>{" "}
        to enable review requests.
      </p>
    );
  }

  return (
    <div>
      <Button variant="secondary" onClick={() => setOpen((v) => !v)}>
        ⭐ Request a Google review
      </Button>

      {open && (
        <div className="mt-3 space-y-3">
          <textarea
            readOnly
            value={message}
            rows={7}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm text-gray-700"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={copy}>{copied ? "Copied!" : "Copy message"}</Button>
            <a
              href={smsHref}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Text it
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
