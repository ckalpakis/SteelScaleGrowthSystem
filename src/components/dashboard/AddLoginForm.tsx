"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button, Input, Label } from "@/components/ui";
import { addClientLogin } from "@/app/dashboard/clients/actions";
import type { SettingsState } from "@/app/dashboard/actions";

const initial: SettingsState = { ok: false };

export function AddLoginForm({ clientId }: { clientId: string }) {
  const [state, formAction] = useFormState(addClientLogin, initial);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="client_id" value={clientId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="login_email">Email</Label>
          <Input id="login_email" name="email" type="email" required placeholder="owner@business.com" />
        </div>
        <div>
          <Label htmlFor="login_password">Temp password</Label>
          <Input id="login_password" name="password" type="text" required placeholder="At least 6 characters" />
        </div>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-600">✓ Login created.</p>}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Creating..." : "Create login"}</Button>;
}
