"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Modal } from "@/components/dashboard/reputation/Modal";

// A promise-free confirmation dialog built on Modal. Drive it with open state
// and an onConfirm callback. Supports a destructive style and async work.
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            onClick={confirm}
            disabled={busy}
            className={destructive ? "!bg-red-600 hover:!bg-red-700" : undefined}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-[#787774]">{description ?? "Are you sure? This action can't be undone."}</p>
    </Modal>
  );
}

// Small hook to manage a confirm dialog for a target value (e.g. an id to delete).
export function useConfirm<T = string>() {
  const [target, setTarget] = useState<T | null>(null);
  return {
    target,
    open: target !== null,
    ask: (value: T) => setTarget(value),
    close: () => setTarget(null),
  };
}
