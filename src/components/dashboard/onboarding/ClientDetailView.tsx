"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge, Button, Card, CardBody, Input } from "@/components/ui";
import { ClientStatusBadge, RunStatusBadge, stepTone } from "@/components/dashboard/onboarding/StatusBadge";
import {
  completeAdminTaskAction,
  editClientConfigAction,
  markCustomValuesTaskCompleteAction,
  markSnapshotTaskCompleteAction,
  pauseClientAction,
  setClientLocationIdAction,
  rerunCustomValueSyncAction,
  retryProvisioningAction,
} from "@/app/dashboard/onboarding/actions";
import type { ClientDetail } from "@/lib/onboarding/admin.server";

const STEP_LABELS: Record<string, string> = {
  validate_submission: "Validate submission",
  create_ghl_location: "Create location",
  obtain_location_token: "Obtain location token",
  apply_snapshot: "Apply snapshot",
  discover_custom_values: "Discover custom values",
  update_custom_values: "Update custom values",
  create_webhook_credential: "Create webhook credentials",
  run_health_checks: "Health checks",
  finalize: "Finalize",
};
const STEP_ORDER = Object.keys(STEP_LABELS);

const GHL_APP_BASE = process.env.NEXT_PUBLIC_GHL_APP_URL || "https://app.gohighlevel.com";

export function ClientDetailView({ detail }: { detail: ClientDetail }) {
  const { client, location, run, steps, tasks, webhook } = detail;
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const stepByKey = new Map(steps.map((s) => [s.step_key, s]));
  const openTasks = tasks.filter((t) => t.status === "open");

  async function withBusy(key: string, fn: () => Promise<{ ok: boolean; message: string } | void>) {
    setBusy(key);
    setMsg(null);
    try {
      const res = await fn();
      if (res && "message" in res) setMsg(res.message);
    } finally {
      setBusy(null);
    }
  }

  const safeGhlUrl = location?.ghl_location_id ? `${GHL_APP_BASE}/v2/location/${location.ghl_location_id}` : null;

  return (
    <div className="mt-3 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#37352f]">{client.public_business_name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <ClientStatusBadge status={client.status} />
            {run && <RunStatusBadge status={run.status} />}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {run && (
            <Button variant="secondary" disabled={busy !== null} onClick={() => withBusy("retry", () => retryProvisioningAction(run.id))}>
              {busy === "retry" ? "Retrying…" : "Retry provisioning"}
            </Button>
          )}
          {run && (
            <Button variant="secondary" disabled={busy !== null} onClick={() => withBusy("resync", () => rerunCustomValueSyncAction(run.id))}>
              Re-run value sync
            </Button>
          )}
          <Link href={`/dashboard/onboarding/clients/${client.id}/webhook`} className="inline-flex items-center rounded-md border border-[#e0e0de] bg-white px-3.5 py-2 text-sm font-medium text-[#37352f] hover:bg-[#f7f7f5]">
            Webhook setup
          </Link>
          {safeGhlUrl && (
            <a href={safeGhlUrl} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-md border border-[#e0e0de] bg-white px-3.5 py-2 text-sm font-medium text-[#37352f] hover:bg-[#f7f7f5]">
              Open GHL sub-account ↗
            </a>
          )}
          {client.status !== "paused" && (
            <Button variant="secondary" disabled={busy !== null} onClick={() => { if (confirm("Pause this client? Provisioning and sends will stop.")) withBusy("pause", () => pauseClientAction(client.id)); }}>
              Pause
            </Button>
          )}
        </div>
      </div>

      {msg && <p className="rounded-md bg-[#f7f7f5] px-3 py-2 text-sm text-[#37352f]">{msg}</p>}

      {/* Open admin tasks */}
      {openTasks.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardBody>
            <h2 className="text-sm font-semibold text-amber-800">Open admin tasks</h2>
            <div className="mt-3 space-y-3">
              {openTasks.map((t) => (
                <div key={t.id} className="rounded-lg border border-amber-200 bg-white p-3">
                  <div className="font-medium text-[#37352f]">{t.title}</div>
                  {t.instructions && <pre className="mt-1 whitespace-pre-wrap font-sans text-xs text-[#5f5e5b]">{t.instructions}</pre>}
                  {t.task_type === "enter_location_id" && (
                    <LocationIdForm
                      clientId={client.id}
                      busy={busy !== null}
                      onSave={(value) => withBusy(`loc-${t.id}`, () => setClientLocationIdAction(client.id, value))}
                    />
                  )}
                  <div className="mt-2 flex gap-2">
                    {t.task_type === "load_review_snapshot" ? (
                      <Button disabled={busy !== null} onClick={() => withBusy(`snap-${t.id}`, () => markSnapshotTaskCompleteAction(t.id))}>
                        Mark snapshot complete
                      </Button>
                    ) : t.task_type === "set_custom_values" ? (
                      <Button disabled={busy !== null} onClick={() => withBusy(`cv-${t.id}`, () => markCustomValuesTaskCompleteAction(t.id))}>
                        Mark custom values done
                      </Button>
                    ) : t.task_type === "enter_location_id" ? null : (
                      <Button disabled={busy !== null} onClick={() => withBusy(`done-${t.id}`, () => completeAdminTaskAction(t.id, "complete"))}>
                        Mark complete
                      </Button>
                    )}
                    <Button variant="ghost" disabled={busy !== null} onClick={() => withBusy(`dismiss-${t.id}`, () => completeAdminTaskAction(t.id, "dismissed"))}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Business */}
        <Card>
          <CardBody>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#91918e]">Business</h2>
              <button className="text-xs font-medium text-brand hover:underline" onClick={() => setEditing((e) => !e)}>
                {editing ? "Cancel" : "Edit"}
              </button>
            </div>
            {editing ? (
              <EditForm client={client} onDone={(m) => { setMsg(m); setEditing(false); }} />
            ) : (
              <dl className="space-y-2 text-sm">
                <Row label="Business name" value={client.public_business_name} />
                <Row label="Legal name" value={client.legal_business_name} />
                <Row label="Owner" value={client.owner_first_name} />
                <Row label="Email" value={client.primary_email} />
                <Row label="Phone" value={client.primary_phone} />
                <Row label="Website" value={client.website_url} />
                <Row label="Address" value={[client.address_line_1, client.city, client.state, client.postal_code].filter(Boolean).join(", ")} />
                <Row label="Google review link" value={client.google_review_link} />
                <Row label="Logo" value={client.logo_url ? "Uploaded" : "—"} />
                <Row label="Reviews / 14 days" value={String(client.review_request_limit_14_days)} />
                <Row label="Follow-ups" value={String(client.follow_up_count)} />
                <Row label="Ask for referral" value={client.ask_for_referral ? "Yes" : "No"} />
              </dl>
            )}
          </CardBody>
        </Card>

        {/* GHL */}
        <Card>
          <CardBody>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#91918e]">GHL</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Location ID" value={location?.ghl_location_id ?? "Not created"} mono />
              <Row label="Creation status" value={location?.provider_status ?? "not_started"} />
              <Row label="Snapshot status" value={location?.snapshot_status ?? "not_started"} />
              <Row label="Custom values" value={location?.custom_values_status ?? "not_started"} />
              <Row label="Last sync" value={location?.last_synced_at ? new Date(location.last_synced_at).toLocaleString() : "—"} />
              <Row label="Webhook" value={webhook ? `${webhook.publicId}${webhook.enabled ? " (enabled)" : ""}` : "Not created"} mono />
            </dl>
          </CardBody>
        </Card>
      </div>

      {/* Provisioning timeline */}
      <Card>
        <CardBody>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#91918e]">Provisioning timeline</h2>
          <ol className="space-y-2">
            {STEP_ORDER.map((key) => {
              const s = stepByKey.get(key as never);
              const status = s?.status ?? "pending";
              return (
                <li key={key} className="flex items-center gap-3 text-sm">
                  <span className={`text-lg leading-none ${stepTone(status)}`}>{status === "complete" ? "●" : status === "failed" ? "✕" : status === "manual_required" ? "▲" : "○"}</span>
                  <span className="flex-1 text-[#37352f]">{STEP_LABELS[key]}</span>
                  <span className={`text-xs ${stepTone(status)}`}>{status.replace(/_/g, " ")}</span>
                  {s?.safe_error_message && <span className="max-w-[40%] truncate text-xs text-red-500" title={s.safe_error_message}>{s.safe_error_message}</span>}
                </li>
              );
            })}
          </ol>
          {run?.safe_error_message && <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{run.safe_error_message}</p>}
        </CardBody>
      </Card>

      {/* Completed / dismissed tasks */}
      {tasks.some((t) => t.status !== "open") && (
        <Card>
          <CardBody>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#91918e]">Task history</h2>
            <div className="space-y-1.5">
              {tasks.filter((t) => t.status !== "open").map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span className="text-[#5f5e5b]">{t.title}</span>
                  <Badge className={t.status === "complete" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}>{t.status}</Badge>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-[#91918e]">{label}</dt>
      <dd className={`min-w-0 truncate text-right text-[#37352f] ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</dd>
    </div>
  );
}

function EditForm({ client, onDone }: { client: ClientDetail["client"]; onDone: (msg: string) => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    public_business_name: client.public_business_name,
    owner_first_name: client.owner_first_name,
    primary_email: client.primary_email,
    website_url: client.website_url ?? "",
    google_review_link: client.google_review_link ?? "",
    review_request_limit_14_days: String(client.review_request_limit_14_days),
    follow_up_count: String(client.follow_up_count),
    ask_for_referral: client.ask_for_referral,
  });

  async function save() {
    setSaving(true);
    try {
      const res = await editClientConfigAction(client.id, {
        public_business_name: form.public_business_name,
        owner_first_name: form.owner_first_name,
        primary_email: form.primary_email,
        website_url: form.website_url,
        google_review_link: form.google_review_link,
        review_request_limit_14_days: Number(form.review_request_limit_14_days),
        follow_up_count: Number(form.follow_up_count),
        ask_for_referral: form.ask_for_referral,
      });
      onDone(res.message);
    } finally {
      setSaving(false);
    }
  }

  const input = "w-full rounded-md border border-[#e0e0de] px-3 py-2 text-sm";
  return (
    <div className="space-y-3 text-sm">
      {([
        ["public_business_name", "Business name"],
        ["owner_first_name", "Owner"],
        ["primary_email", "Email"],
        ["website_url", "Website"],
        ["google_review_link", "Google review link"],
      ] as const).map(([k, label]) => (
        <div key={k}>
          <label className="mb-1 block text-xs text-[#91918e]">{label}</label>
          <input className={input} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
        </div>
      ))}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-[#91918e]">Reviews / 14 days</label>
          <input type="number" className={input} value={form.review_request_limit_14_days} onChange={(e) => setForm((f) => ({ ...f, review_request_limit_14_days: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[#91918e]">Follow-ups (0–3)</label>
          <input type="number" min={0} max={3} className={input} value={form.follow_up_count} onChange={(e) => setForm((f) => ({ ...f, follow_up_count: e.target.value }))} />
        </div>
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={form.ask_for_referral} onChange={(e) => setForm((f) => ({ ...f, ask_for_referral: e.target.checked }))} />
        Ask for referral
      </label>
      <Button disabled={saving} onClick={save}>{saving ? "Saving…" : "Save changes"}</Button>
    </div>
  );
}

// Inline form to enter the GHL Location ID for a client (manual location mode).
function LocationIdForm({ clientId, busy, onSave }: { clientId: string; busy: boolean; onSave: (value: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        aria-label={`GHL Location ID for ${clientId}`}
        placeholder="Paste the GHL Location ID"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="sm:max-w-xs"
      />
      <Button disabled={busy || value.trim().length < 6} onClick={() => onSave(value.trim())}>
        Save Location ID
      </Button>
    </div>
  );
}
