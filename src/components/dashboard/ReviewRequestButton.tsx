"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

// Generates a prefilled review-request message and lets the user copy it, text
// it, or email it. The message + links are built server-side and passed in.
//
// `compact` renders a small inline trigger suited to a lead card: just the
// action buttons (no message preview), and nothing at all when there's no
// review link configured.
export function ReviewRequestButton({
  message,
  smsHref,
  emailHref,
  hasReviewLink,
  compact = false,
}: {
  message: string;
  smsHref: string;
  emailHref: string;
  hasReviewLink: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!hasReviewLink) {
    // On cards, stay quiet; on the detail page, nudge the owner to set it up.
    if (compact) return null;
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

  if (compact) {
    return (
      <div onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-xs font-medium text-brand hover:underline"
        >
          ⭐ {open ? "Hide" : "Review request"}
        </button>
        {open && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <CompactAction onClick={copy}>{copied ? "Copied!" : "Copy"}</CompactAction>
            <CompactLink href={smsHref}>SMS</CompactLink>
            <CompactLink href={emailHref}>Email</CompactLink>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <Button variant="secondary" onClick={() => setOpen((v) => !v)}>
        ⭐ Create Review Request
      </Button>

      {open && (
        <div className="mt-3 space-y-3">
          <textarea
            readOnly
            value={message}
            rows={6}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm text-gray-700"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={copy}>{copied ? "Copied!" : "Copy message"}</Button>
            <a
              href={smsHref}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Open SMS
            </a>
            <a
              href={emailHref}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Open Email
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function CompactAction({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
    >
      {children}
    </button>
  );
}

function CompactLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
    >
      {children}
    </a>
  );
}
