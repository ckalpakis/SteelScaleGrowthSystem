"use client";

import { useState } from "react";

import { Button, Card, CardBody } from "@/components/ui";
import { regenerateWebhookSecretAction, sendRealTestSmsAction, testConfigurationAction } from "@/app/dashboard/onboarding/actions";
import type { WorkflowPayload } from "@/lib/onboarding/webhook-setup";
import type { ChecklistItem } from "@/lib/onboarding/test-config";

interface Props {
  clientId: string;
  businessName: string;
  locationId: string | null;
  webhookConfigured: boolean;
  webhookPublicId: string | null;
  webhookUrl: string;
  secretHeader: string;
  method: string;
  contentType: string;
  payloads: WorkflowPayload[];
  instructions: string[];
}

function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* ignore */
        }
      }}
      className="rounded-md border border-[#e0e0de] bg-white px-2 py-1 text-xs font-medium text-[#37352f] hover:bg-[#f7f7f5]"
    >
      {done ? "Copied ✓" : "Copy"}
    </button>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#f1f1ef] py-2 last:border-0">
      <span className="shrink-0 text-xs text-[#91918e]">{label}</span>
      <span className="flex min-w-0 items-center gap-2">
        <code className="truncate rounded bg-[#f7f7f5] px-1.5 py-0.5 text-xs text-[#37352f]">{value}</code>
        <Copy text={value} />
      </span>
    </div>
  );
}

export function WebhookSetupView(props: Props) {
  const [secret, setSecret] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [checklist, setChecklist] = useState<{ items: ChecklistItem[]; passed: boolean } | null>(null);
  const [verifySecret, setVerifySecret] = useState("");
  const [testing, setTesting] = useState(false);

  async function rotate() {
    if (props.webhookConfigured && !confirm("Rotate the secret? The old secret stops working immediately and must be reinstalled in GHL.")) return;
    setRotating(true);
    try {
      const res = await regenerateWebhookSecretAction(props.clientId);
      if (res.ok && res.rawSecret) setSecret(res.rawSecret);
    } finally {
      setRotating(false);
    }
  }

  async function runTest() {
    setTesting(true);
    try {
      setChecklist(await testConfigurationAction(props.clientId, verifySecret || undefined));
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="mt-3 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#37352f]">Workflow setup</h1>
        <p className="mt-1 text-sm text-[#5f5e5b]">{props.businessName} · configure the review workflow to send requests through Steel Scale.</p>
      </div>

      {/* Connection details */}
      <Card>
        <CardBody>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#91918e]">Connection</h2>
          <div className="rounded-lg border border-[#ededec]">
            <div className="px-3">
              <Field label="Business" value={props.businessName} />
              <Field label="GHL location ID" value={props.locationId ?? "Not created yet"} />
              <Field label="Webhook URL" value={props.webhookUrl} />
              <Field label="Header name" value={props.secretHeader} />
              <Field label="HTTP method" value={props.method} />
              <Field label="Content type" value={props.contentType} />
            </div>
          </div>

          {/* One-time secret */}
          <div className="mt-4 rounded-lg border border-[#ededec] bg-[#f7f7f5] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium text-[#37352f]">One-time webhook secret</div>
              <Button variant="secondary" disabled={rotating} onClick={rotate}>
                {rotating ? "Generating…" : props.webhookConfigured ? "Rotate secret" : "Generate secret"}
              </Button>
            </div>
            {secret ? (
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1.5 text-xs">{secret}</code>
                <Copy text={secret} />
              </div>
            ) : (
              <p className="mt-2 text-xs text-[#91918e]">
                {props.webhookConfigured
                  ? `A secret is configured (${props.webhookPublicId}). For security it is never shown again — rotate to get a new one.`
                  : "No secret yet. Generate one and copy it now — it is shown only once."}
              </p>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Payloads */}
      <Card>
        <CardBody>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#91918e]">Workflow payloads</h2>
          <p className="mb-3 text-xs text-[#91918e]">
            Steel Scale resolves business name, logo, and review link from its own record using the authenticated location
            ID — these payloads only pass contact and location identifiers.
          </p>
          <div className="space-y-4">
            {props.payloads.map((p) => (
              <div key={p.stage}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-[#37352f]">{p.label} <span className="text-[#91918e]">· {p.eventType}</span></span>
                  <Copy text={p.json} />
                </div>
                <pre className="overflow-x-auto rounded-lg bg-[#0f0f0f] p-3 text-xs text-[#e6e6e6]">{p.json}</pre>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Instructions */}
      <Card>
        <CardBody>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#91918e]">Setup steps</h2>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-[#37352f]">
            {props.instructions.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </CardBody>
      </Card>

      {/* Test configuration */}
      <Card>
        <CardBody>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#91918e]">Test configuration</h2>
          <p className="mb-3 text-xs text-[#91918e]">Validates the setup without sending a real message.</p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-[#91918e]">Verify a saved secret (optional)</label>
              <input value={verifySecret} onChange={(e) => setVerifySecret(e.target.value)} placeholder="Paste the secret to verify it matches" className="w-full rounded-md border border-[#e0e0de] px-3 py-2 text-sm" />
            </div>
            <Button variant="secondary" disabled={testing} onClick={runTest}>{testing ? "Checking…" : "Run test"}</Button>
          </div>
          {checklist && (
            <ul className="mt-4 space-y-2">
              {checklist.items.map((item) => (
                <li key={item.key} className="flex items-start gap-2 text-sm">
                  <span className={item.ok ? "text-green-600" : "text-red-600"}>{item.ok ? "✓" : "✕"}</span>
                  <span>
                    <span className="font-medium text-[#37352f]">{item.label}</span>
                    <span className="block text-xs text-[#5f5e5b]">{item.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <RealTest clientId={props.clientId} />
    </div>
  );
}

function RealTest({ clientId }: { clientId: string }) {
  const [number, setNumber] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function send() {
    setSending(true);
    setMsg(null);
    try {
      const res = await sendRealTestSmsAction(clientId, number, confirmed);
      setMsg(res.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="border-amber-200">
      <CardBody>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-amber-700">Send a real test (optional)</h2>
        <p className="mb-3 text-xs text-[#91918e]">Sends one real SMS to a number you control. Only use an opted-in number.</p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-[#91918e]">Opted-in phone number</label>
            <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="+14125550100" className="w-full rounded-md border border-[#e0e0de] px-3 py-2 text-sm" />
          </div>
          <Button disabled={sending || !confirmed || !number} onClick={send}>{sending ? "Sending…" : "Send test SMS"}</Button>
        </div>
        <label className="mt-2 flex items-center gap-2 text-sm text-[#5f5e5b]">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          I confirm this number has opted in to receive messages.
        </label>
        {msg && <p className="mt-2 text-sm text-[#37352f]">{msg}</p>}
      </CardBody>
    </Card>
  );
}
