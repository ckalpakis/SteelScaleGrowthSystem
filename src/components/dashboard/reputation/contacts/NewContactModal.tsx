"use client";

import { useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { Modal } from "@/components/dashboard/reputation/Modal";
import type { ContactInput } from "@/app/dashboard/reputation/contacts/actions";

// Presentational New Contact form. Submission (+ optimistic add) is owned by the
// parent via onCreate, which returns an error string on failure.
export function NewContactModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: ContactInput) => Promise<string | null>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const input: ContactInput = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      service: String(fd.get("service") ?? ""),
      completed_job_date: String(fd.get("completed_job_date") ?? ""),
    };
    const err = await onCreate(input);
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    (e.target as HTMLFormElement).reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New contact" description="Add someone you can request a review from.">
      <form id="new-contact-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="c-name">Customer name *</Label>
          <Input id="c-name" name="name" required placeholder="Jane Smith" autoFocus />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="c-phone">Phone</Label>
            <Input id="c-phone" name="phone" placeholder="(412) 555-0123" />
          </div>
          <div>
            <Label htmlFor="c-email">Email</Label>
            <Input id="c-email" name="email" type="email" placeholder="jane@example.com" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="c-service">Service</Label>
            <Input id="c-service" name="service" placeholder="Roof Replacement" />
          </div>
          <div>
            <Label htmlFor="c-date">Completed job date</Label>
            <Input id="c-date" name="completed_job_date" type="date" />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" form="new-contact-form" disabled={saving}>
          {saving ? "Saving…" : "Add contact"}
        </Button>
      </div>
    </Modal>
  );
}
