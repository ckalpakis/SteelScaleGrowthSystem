"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useToast } from "@/components/dashboard/reputation/Toast";
import { syncNow } from "@/app/dashboard/integrations/dashboard/actions";

// Enqueues a sync and shows a brief in-flight state. Real progress is reflected
// by the card's sync-job status after the queue is processed.
export function SyncNowButton({ provider, name }: { provider: string; name: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const res = await syncNow(provider);
    setBusy(false);
    if (!res.ok) {
      toast({ title: "Couldn't start sync", description: res.error, variant: "error" });
      return;
    }
    toast({ title: `Sync started for ${name}`, description: "Fetching customers, jobs, and appointments.", variant: "success" });
    router.refresh();
  }

  return (
    <Button onClick={run} disabled={busy} className="text-sm">
      {busy ? (
        <>
          <Spinner /> Syncing…
        </>
      ) : (
        <>
          <RefreshIcon /> Sync now
        </>
      )}
    </Button>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="mr-1.5 h-4 w-4 animate-spin" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mr-1.5 h-4 w-4">
      <path d="M20 11a8 8 0 0 0-14-4.9L4 8m0 0V4m0 4h4M4 13a8 8 0 0 0 14 4.9l2-1.9m0 0v4m0-4h-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
