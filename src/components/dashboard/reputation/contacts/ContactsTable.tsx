"use client";

import { useOptimistic, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";
import { PageHeader, StatusPill, SearchIcon, PlusIcon } from "@/components/dashboard/reputation/ui";
import { Modal } from "@/components/dashboard/reputation/Modal";
import { NewContactModal } from "@/components/dashboard/reputation/contacts/NewContactModal";
import { CONTACT_STATUS_FILTERS, type ContactStatus, type ReviewContact } from "@/lib/reputation";
import {
  createContact,
  deleteContact,
  deleteContacts,
  sendReviewRequest,
  type ContactInput,
} from "@/app/dashboard/reputation/contacts/actions";

type Query = { q: string; status: string; sort: string; dir: string };

const STATUS_TONE: Record<ContactStatus, "blue" | "amber" | "green" | "gray"> = {
  new: "blue",
  requested: "amber",
  reviewed: "green",
  opted_out: "gray",
};
const STATUS_LABEL: Record<ContactStatus, string> = {
  new: "New",
  requested: "Requested",
  reviewed: "Reviewed",
  opted_out: "Opted out",
};

type OptAction =
  | { t: "add"; contact: ReviewContact }
  | { t: "delete"; ids: string[] }
  | { t: "requested"; id: string };

export function ContactsTable({
  contacts,
  total,
  page,
  pageSize,
  query,
}: {
  contacts: ReviewContact[];
  total: number;
  page: number;
  pageSize: number;
  query: Query;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [rows, dispatch] = useOptimistic(contacts, (state: ReviewContact[], a: OptAction) => {
    if (a.t === "add") return [a.contact, ...state];
    if (a.t === "delete") return state.filter((c) => !a.ids.includes(c.id));
    if (a.t === "requested")
      return state.map((c) => (c.id === a.id ? { ...c, status: "requested" as ContactStatus } : c));
    return state;
  });

  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newOpen, setNewOpen] = useState(false);
  const [viewing, setViewing] = useState<ReviewContact | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const allSelected = rows.length > 0 && rows.every((c) => selected.has(c.id));

  // ---- URL state (search / filter / sort / pagination) ----
  function setParams(updates: Record<string, string | null>, resetPage = true) {
    const p = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") p.delete(k);
      else p.set(k, v);
    }
    if (resetPage && !("page" in updates)) p.delete("page");
    router.push(`${pathname}?${p.toString()}`);
  }

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    setParams({ q: value || null });
  }

  function onSort(col: string) {
    const dir = query.sort === col && query.dir === "asc" ? "desc" : "asc";
    setParams({ sort: col, dir });
  }

  // ---- Mutations (optimistic) ----
  function handleDelete(id: string) {
    startTransition(async () => {
      dispatch({ t: "delete", ids: [id] });
      setSelected((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
      await deleteContact(id);
    });
  }

  function handleBulkDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    startTransition(async () => {
      dispatch({ t: "delete", ids });
      setSelected(new Set());
      await deleteContacts(ids);
    });
  }

  function handleSend(id: string) {
    startTransition(async () => {
      dispatch({ t: "requested", id });
      await sendReviewRequest(id);
    });
  }

  function handleMessage(c: ReviewContact) {
    if (c.phone) window.location.href = `sms:${c.phone.replace(/[^\d+]/g, "")}`;
    else if (c.email) window.location.href = `mailto:${c.email}`;
  }

  function handleCreate(input: ContactInput): Promise<string | null> {
    return new Promise((resolve) => {
      startTransition(async () => {
        const now = new Date().toISOString();
        dispatch({
          t: "add",
          contact: {
            id: `temp-${Date.now()}`,
            company_id: "",
            lead_id: null,
            name: input.name,
            email: input.email || null,
            phone: input.phone || null,
            service: input.service || null,
            completed_job_date: input.completed_job_date || null,
            tags: [],
            source: "manual",
            status: "new",
            sms_consent: false,
            last_requested_at: null,
            created_at: now,
            updated_at: now,
          },
        });
        const res = await createContact(input);
        resolve(res.ok ? null : res.error);
      });
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((c) => c.id)));
  }
  function toggleOne(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contacts"
        description="People you can request reviews from."
        action={
          <Button onClick={() => setNewOpen(true)}>
            <PlusIcon className="mr-1.5 h-4 w-4" /> New contact
          </Button>
        }
      />

      {/* Search + status filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={onSearch} className="relative w-full sm:max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9b9a97]">
            <SearchIcon />
          </span>
          <input
            key={query.q}
            name="q"
            defaultValue={query.q}
            placeholder="Search name, email, phone, service…"
            className="w-full rounded-md border border-[#e0e0de] bg-white py-2 pl-9 pr-3 text-sm text-[#37352f] placeholder-[#b9b9b7] transition-colors focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15"
          />
        </form>
        <div className="flex flex-wrap gap-1 rounded-lg border border-[#e0e0de] bg-white p-0.5">
          {CONTACT_STATUS_FILTERS.map((f) => {
            const active = (query.status || "all") === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setParams({ status: f.value === "all" ? null : f.value })}
                className={
                  "rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors " +
                  (active ? "bg-brand text-white" : "text-[#787774] hover:bg-black/[0.04]")
                }
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-brand/20 bg-brand/[0.04] px-4 py-2.5 text-sm">
          <span className="font-medium text-[#37352f]">{selected.size} selected</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="text-xs" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <Button variant="secondary" className="text-xs !text-red-600" onClick={handleBulkDelete}>
              Delete selected
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#ededec] bg-white shadow-[0_1px_2px_rgba(15,15,15,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[#f0f0ef] bg-[#fafafa] text-left text-xs uppercase tracking-wide text-[#9b9a97]">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-gray-300 accent-brand" />
                </th>
                <SortTh label="Customer" col="name" query={query} onSort={onSort} />
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <SortTh label="Completed" col="completed_job_date" query={query} onSort={onSort} />
                <SortTh label="Review Status" col="status" query={query} onSort={onSort} />
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0ef]">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-sm text-[#9b9a97]">
                    No contacts found. Try adjusting your search or add a new contact.
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-[#fafafa]">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleOne(c.id)}
                        className="h-4 w-4 rounded border-gray-300 accent-brand"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                          {c.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="font-medium text-[#37352f]">{c.name}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[#787774]">{c.phone ?? "—"}</td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-[#787774]">{c.email ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-[#787774]">{c.service ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-[#787774]">{formatDate(c.completed_job_date)}</td>
                    <td className="px-4 py-3">
                      <StatusPill tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</StatusPill>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        <IconButton title="View" onClick={() => setViewing(c)}><EyeIcon /></IconButton>
                        <IconButton title="Send review request" onClick={() => handleSend(c.id)}><SendIcon2 /></IconButton>
                        <IconButton title="Message" onClick={() => handleMessage(c)}><ChatIcon2 /></IconButton>
                        <IconButton title="Delete" danger onClick={() => handleDelete(c.id)}><TrashIcon /></IconButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f0ef] px-4 py-3 text-sm text-[#787774]">
          <span>
            {total === 0 ? "No contacts" : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="text-xs"
              disabled={page <= 1}
              onClick={() => setParams({ page: String(page - 1) }, false)}
            >
              Previous
            </Button>
            <span className="text-xs">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              className="text-xs"
              disabled={page >= totalPages}
              onClick={() => setParams({ page: String(page + 1) }, false)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <NewContactModal open={newOpen} onClose={() => setNewOpen(false)} onCreate={handleCreate} />
      <Modal open={viewing !== null} onClose={() => setViewing(null)} title={viewing?.name ?? "Contact"}>
        {viewing && (
          <dl className="grid gap-3 sm:grid-cols-2">
            <Detail label="Phone" value={viewing.phone} />
            <Detail label="Email" value={viewing.email} />
            <Detail label="Service" value={viewing.service} />
            <Detail label="Completed job" value={formatDate(viewing.completed_job_date)} />
            <Detail label="Review status" value={STATUS_LABEL[viewing.status]} />
            <Detail label="Source" value={viewing.source} />
          </dl>
        )}
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------- subcomponents
function SortTh({ label, col, query, onSort }: { label: string; col: string; query: Query; onSort: (c: string) => void }) {
  const active = query.sort === col;
  return (
    <th className="px-4 py-3 font-medium">
      <button onClick={() => onSort(col)} className="inline-flex items-center gap-1 hover:text-[#37352f]">
        {label}
        <span className={active ? "text-[#37352f]" : "text-[#d0d0ce]"}>{active && query.dir === "desc" ? "↓" : "↑"}</span>
      </button>
    </th>
  );
}

function IconButton({ title, onClick, children, danger }: { title: string; onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      className={
        "rounded-md p-1.5 text-[#9b9a97] transition-colors hover:bg-black/[0.05] " +
        (danger ? "hover:text-red-600" : "hover:text-[#37352f]")
      }
    >
      {children}
    </button>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-[#9b9a97]">{label}</dt>
      <dd className="mt-0.5 text-sm text-[#37352f]">{value || "—"}</dd>
    </div>
  );
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// small icons
function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function SendIcon2() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
      <path d="M21 3 10.5 13.5M21 3l-6.5 18-4-8-8-4L21 3z" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
function ChatIcon2() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
      <path d="M4 5h16v11H9l-4 3.5V16H4V5z" strokeLinejoin="round" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
      <path d="M4 7h16M9 7V5h6v2M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
