"use client";

import { useState } from "react";
import { cn } from "@/components/ui";
import { useToast } from "@/components/dashboard/reputation/Toast";
import { replayEvent, replaySyncJob } from "@/app/dashboard/developer/actions";
import type {
  DeveloperConsoleData,
  LogRow,
  EventRow,
  WorkflowRow,
  SyncRow,
} from "@/app/dashboard/developer/data";

type TabKey = "webhooks" | "api" | "events" | "workflows" | "retries" | "sync";

const TABS: { key: TabKey; label: string }[] = [
  { key: "webhooks", label: "Incoming Webhooks" },
  { key: "api", label: "Outgoing API" },
  { key: "events", label: "Published Events" },
  { key: "workflows", label: "Workflow Executions" },
  { key: "retries", label: "Retry Attempts" },
  { key: "sync", label: "Sync History" },
];

const dt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" });
const fmt = (iso: string) => dt.format(new Date(iso));

export function DeveloperConsole({ data }: { data: DeveloperConsoleData }) {
  const [tab, setTab] = useState<TabKey>("webhooks");
  const counts: Record<TabKey, number> = {
    webhooks: data.webhooks.length,
    api: data.apiRequests.length,
    events: data.events.length,
    workflows: data.workflows.length,
    retries: data.retries.length,
    sync: data.syncHistory.length,
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-[#2a2a2a]">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-t-md px-3 py-2 text-xs font-medium transition-colors",
              tab === t.key ? "bg-[#1b1b1b] text-white" : "text-[#8a8a8a] hover:text-white"
            )}
          >
            {t.label}
            <span className="ml-1.5 rounded-full bg-[#2a2a2a] px-1.5 py-0.5 text-[10px] text-[#b8b8b8]">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-[#2a2a2a] bg-[#141414]">
        {tab === "webhooks" && <LogTable rows={data.webhooks} empty="No webhook activity logged yet." />}
        {tab === "api" && <LogTable rows={data.apiRequests} empty="No outgoing API requests logged yet." />}
        {tab === "retries" && <LogTable rows={data.retries} empty="No retry attempts logged yet." />}
        {tab === "events" && <EventsTable rows={data.events} />}
        {tab === "workflows" && <WorkflowsTable rows={data.workflows} />}
        {tab === "sync" && <SyncTable rows={data.syncHistory} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- raw payload
function Raw({ value }: { value: unknown }) {
  const [open, setOpen] = useState(false);
  const isEmpty = value == null || (typeof value === "object" && Object.keys(value as object).length === 0);
  if (isEmpty) return <span className="text-[#5a5a5a]">—</span>;
  return (
    <div>
      <button onClick={() => setOpen((o) => !o)} className="text-[11px] font-medium text-brand hover:underline">
        {open ? "hide" : "raw"}
      </button>
      {open && (
        <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-[#0c0c0c] p-2.5 text-[11px] leading-relaxed text-[#c8d3a0]">
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </div>
  );
}

function Level({ level }: { level: string }) {
  const tone =
    level === "error" ? "bg-red-500/15 text-red-400" : level === "warn" ? "bg-amber-500/15 text-amber-400" : "bg-sky-500/15 text-sky-300";
  return <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase", tone)}>{level}</span>;
}

const th = "px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-[#7a7a7a]";
const td = "px-3 py-2 align-top text-[#d0d0d0]";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">{children}</table>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-4 py-10 text-center text-xs text-[#6a6a6a]">{text}</p>;
}

// ---------------------------------------------------------------- log table
function LogTable({ rows, empty }: { rows: LogRow[]; empty: string }) {
  if (rows.length === 0) return <Empty text={empty} />;
  return (
    <Shell>
      <thead className="border-b border-[#2a2a2a] bg-[#181818]">
        <tr>
          <th className={th}>Time</th>
          <th className={th}>Provider</th>
          <th className={th}>Action</th>
          <th className={th}>Level</th>
          <th className={th}>Status</th>
          <th className={th}>ms</th>
          <th className={th}>Message</th>
          <th className={th}>Context</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#222]">
        {rows.map((r) => (
          <tr key={r.id} className="hover:bg-[#181818]">
            <td className={cn(td, "whitespace-nowrap font-mono text-[#9a9a9a]")}>{fmt(r.created_at)}</td>
            <td className={td}>{r.provider ?? "—"}</td>
            <td className={cn(td, "font-mono text-white")}>{r.action}</td>
            <td className={td}><Level level={r.level} /></td>
            <td className={td}>{r.http_status ?? "—"}</td>
            <td className={cn(td, "font-mono text-[#9a9a9a]")}>{r.duration_ms ?? "—"}</td>
            <td className={cn(td, "max-w-[280px] truncate")} title={r.message ?? ""}>{r.message ?? "—"}</td>
            <td className={td}><Raw value={r.context} /></td>
          </tr>
        ))}
      </tbody>
    </Shell>
  );
}

// ---------------------------------------------------------------- events
function EventsTable({ rows }: { rows: EventRow[] }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function replay(id: string) {
    setBusy(id);
    const res = await replayEvent(id);
    setBusy(null);
    toast(res.ok ? { title: "Event replayed", description: res.message, variant: "success" } : { title: "Replay failed", description: res.error, variant: "error" });
  }

  if (rows.length === 0) return <Empty text="No events published yet." />;
  return (
    <Shell>
      <thead className="border-b border-[#2a2a2a] bg-[#181818]">
        <tr>
          <th className={th}>Time</th>
          <th className={th}>Provider</th>
          <th className={th}>Event</th>
          <th className={th}>Dir</th>
          <th className={th}>Status</th>
          <th className={th}>Payload</th>
          <th className={th}></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#222]">
        {rows.map((r) => (
          <tr key={r.id} className="hover:bg-[#181818]">
            <td className={cn(td, "whitespace-nowrap font-mono text-[#9a9a9a]")}>{fmt(r.created_at)}</td>
            <td className={td}>{r.provider}</td>
            <td className={cn(td, "font-mono text-white")}>{r.event_type}</td>
            <td className={td}>{r.direction}</td>
            <td className={td}>{r.status}</td>
            <td className={td}><Raw value={r.payload} /></td>
            <td className={td}>
              <button
                onClick={() => replay(r.id)}
                disabled={busy === r.id}
                className="rounded border border-brand/40 px-2 py-1 text-[11px] font-medium text-brand transition-colors hover:bg-brand/10 disabled:opacity-50"
              >
                {busy === r.id ? "Replaying…" : "Replay"}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </Shell>
  );
}

// ---------------------------------------------------------------- workflows
function WorkflowsTable({ rows }: { rows: WorkflowRow[] }) {
  if (rows.length === 0) return <Empty text="No workflow executions yet." />;
  return (
    <Shell>
      <thead className="border-b border-[#2a2a2a] bg-[#181818]">
        <tr>
          <th className={th}>Time</th>
          <th className={th}>Event</th>
          <th className={th}>Request</th>
          <th className={th}>Data</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#222]">
        {rows.map((r) => (
          <tr key={r.id} className="hover:bg-[#181818]">
            <td className={cn(td, "whitespace-nowrap font-mono text-[#9a9a9a]")}>{fmt(r.created_at)}</td>
            <td className={cn(td, "font-mono text-white")}>{r.event_type}</td>
            <td className={cn(td, "font-mono text-[#9a9a9a]")}>{r.request_id ? r.request_id.slice(0, 8) : "—"}</td>
            <td className={td}><Raw value={r.data} /></td>
          </tr>
        ))}
      </tbody>
    </Shell>
  );
}

// ---------------------------------------------------------------- sync
function SyncTable({ rows }: { rows: SyncRow[] }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function rerun(id: string) {
    setBusy(id);
    const res = await replaySyncJob(id);
    setBusy(null);
    toast(res.ok ? { title: "Sync re-queued", description: res.message, variant: "success" } : { title: "Re-run failed", description: res.error, variant: "error" });
  }

  if (rows.length === 0) return <Empty text="No sync history yet." />;
  return (
    <Shell>
      <thead className="border-b border-[#2a2a2a] bg-[#181818]">
        <tr>
          <th className={th}>Time</th>
          <th className={th}>Provider</th>
          <th className={th}>Job</th>
          <th className={th}>Status</th>
          <th className={th}>OK / Fail</th>
          <th className={th}>Detail</th>
          <th className={th}></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#222]">
        {rows.map((r) => (
          <tr key={r.id} className="hover:bg-[#181818]">
            <td className={cn(td, "whitespace-nowrap font-mono text-[#9a9a9a]")}>{fmt(r.created_at)}</td>
            <td className={td}>{r.provider ?? "—"}</td>
            <td className={cn(td, "font-mono text-white")}>{r.job_type}</td>
            <td className={td}>
              <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase", statusTone(r.status))}>{r.status}</span>
            </td>
            <td className={cn(td, "font-mono")}>
              <span className="text-emerald-400">{r.records_processed}</span> / <span className="text-red-400">{r.records_failed}</span>
            </td>
            <td className={td}><Raw value={r.error ? { error: r.error, stats: r.stats } : r.stats} /></td>
            <td className={td}>
              <button
                onClick={() => rerun(r.id)}
                disabled={busy === r.id}
                className="rounded border border-brand/40 px-2 py-1 text-[11px] font-medium text-brand transition-colors hover:bg-brand/10 disabled:opacity-50"
              >
                {busy === r.id ? "…" : "Re-run"}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </Shell>
  );
}

function statusTone(status: string): string {
  if (status === "succeeded") return "bg-emerald-500/15 text-emerald-400";
  if (status === "failed") return "bg-red-500/15 text-red-400";
  if (status === "running") return "bg-sky-500/15 text-sky-300";
  return "bg-white/10 text-[#b8b8b8]";
}
