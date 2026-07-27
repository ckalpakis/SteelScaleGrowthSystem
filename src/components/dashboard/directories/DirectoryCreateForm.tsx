"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";

import { Button, Card, CardBody, Input, Label } from "@/components/ui";
import { createDirectoryAction, type CreateDirectoryState } from "@/app/dashboard/directories/actions";

const initial: CreateDirectoryState = { ok: null };

export function DirectoryCreateForm() {
  const [state, action] = useFormState(createDirectoryAction, initial);
  const router = useRouter();

  useEffect(() => {
    if (state.ok === true) router.push(`/dashboard/directories/${state.id}`);
  }, [state, router]);

  return (
    <Card>
      <CardBody>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#91918e]">New directory</h2>
        <form action={action} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Gibsonia Business Directory" required />
          </div>
          <div className="flex-1">
            <Label htmlFor="slug">URL slug (optional)</Label>
            <Input id="slug" name="slug" placeholder="gibsonia" />
          </div>
          <SubmitButton />
        </form>
        {state.ok === false && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
      </CardBody>
    </Card>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="sm:w-auto">
      {pending ? "Creating…" : "Create"}
    </Button>
  );
}
