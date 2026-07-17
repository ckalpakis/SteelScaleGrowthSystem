"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Badge, Button, Card, CardBody, Input, Label } from "@/components/ui";
import { createInvitationAction, revokeInvitationAction, type CreateInvitationState } from "@/app/dashboard/onboarding/actions";

export interface InvitationView {
  id: string;
  email: string | null;
  status: string;
  expiresAt: string;
  createdAt: string;
  openedAt: string | null;
  submittedAt: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  opened: "bg-blue-50 text-blue-700",
  submitted: "bg-green-50 text-green-700",
  expired: "bg-amber-50 text-amber-700",
  revoked: "bg-red-50 text-red-700",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Not opened",
  opened: "Opened",
  submitted: "Completed",
  expired: "Expired",
  revoked: "Revoked",
};

const initial: CreateInvitationState = { ok: null };

export function OnboardingAdmin({ invitations }: { invitations: InvitationView[] }) {
  const [state, formAction] = useFormState(createInvitationAction, initial);

  return (
    <div className="space-y-8">
      <Card>
        <CardBody>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#91918e]">New invitation</h2>
          <form action={formAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor="client_email">Client email (optional)</Label>
              <Input id="client_email" name="client_email" type="email" placeholder="owner@business.com" />
            </div>
            <CreateButton />
          </form>
          {state.ok === false && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
          {state.ok === true && <NewLink link={state.link} />}
        </CardBody>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#91918e]">Invitations</h2>
        {invitations.length === 0 ? (
          <Card>
            <CardBody className="text-center text-sm text-[#91918e]">No invitations yet.</CardBody>
          </Card>
        ) : (
          <Card>
            <div className="divide-y divide-[#f1f1ef]">
              {invitations.map((inv) => (
                <InvitationRow key={inv.id} inv={inv} />
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="min-h-[42px] sm:w-auto">
      {pending ? "Creating…" : "Create invitation"}
    </Button>
  );
}

function NewLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }
  return (
    <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
      <p className="text-sm font-medium text-green-800">Invitation created — copy this link now. It won&apos;t be shown again.</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full flex-1 rounded-md border border-green-300 bg-white px-3 py-2 text-sm text-[#37352f]"
        />
        <Button type="button" onClick={copy} variant="secondary" className="shrink-0">
          {copied ? "Copied ✓" : "Copy link"}
        </Button>
      </div>
    </div>
  );
}

function InvitationRow({ inv }: { inv: InvitationView }) {
  const [revoking, setRevoking] = useState(false);
  const canRevoke = inv.status !== "submitted" && inv.status !== "revoked";

  async function revoke() {
    if (!confirm("Revoke this invitation? The link will stop working immediately.")) return;
    setRevoking(true);
    try {
      await revokeInvitationAction(inv.id);
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-[#37352f]">{inv.email ?? "No email"}</div>
        <div className="mt-0.5 text-xs text-[#91918e]">
          Created {fmt(inv.createdAt)} · Expires {fmt(inv.expiresAt)}
          {inv.submittedAt ? ` · Completed ${fmt(inv.submittedAt)}` : inv.openedAt ? ` · Opened ${fmt(inv.openedAt)}` : ""}
        </div>
      </div>
      <Badge className={STATUS_STYLE[inv.status] ?? "bg-gray-100 text-gray-700"}>
        {STATUS_LABEL[inv.status] ?? inv.status}
      </Badge>
      {canRevoke && (
        <button
          type="button"
          onClick={revoke}
          disabled={revoking}
          className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
        >
          {revoking ? "Revoking…" : "Revoke"}
        </button>
      )}
    </div>
  );
}

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}
