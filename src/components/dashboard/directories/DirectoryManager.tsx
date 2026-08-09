"use client";

import { useRef, useState, useTransition } from "react";

import { Button, Card, CardBody, Input, Label } from "@/components/ui";
import {
  deleteListingAction,
  importListingsAction,
  setListingStatusAction,
  setListingTierAction,
  updateDirectoryAction,
} from "@/app/dashboard/directories/actions";
import type { Directory, DirectoryListing } from "@/lib/directory/types";

export function DirectoryManager({ directory, listings }: { directory: Directory; listings: DirectoryListing[] }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      {msg && <p className="rounded-md bg-[#f7f7f5] px-3 py-2 text-sm text-[#37352f]">{msg}</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <BrandingForm directory={directory} onMsg={setMsg} />
        <ImportCard directoryId={directory.id} onMsg={setMsg} />
      </div>
      <ListingsTable directoryId={directory.id} listings={listings} pending={pending} run={startTransition} onMsg={setMsg} />
    </div>
  );
}

function BrandingForm({ directory, onMsg }: { directory: Directory; onMsg: (m: string) => void }) {
  const [form, setForm] = useState({
    name: directory.name,
    tagline: directory.tagline ?? "",
    hero_title: directory.hero_title ?? "",
    hero_subtitle: directory.hero_subtitle ?? "",
    hero_image_url: directory.hero_image_url ?? "",
    logo_url: directory.logo_url ?? "",
    primary_color: directory.primary_color,
    meta_title: directory.meta_title ?? "",
    meta_description: directory.meta_description ?? "",
    published: directory.published,
  });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    const res = await updateDirectoryAction(directory.id, {
      name: form.name,
      tagline: form.tagline || null,
      hero_title: form.hero_title || null,
      hero_subtitle: form.hero_subtitle || null,
      hero_image_url: form.hero_image_url || null,
      logo_url: form.logo_url || null,
      primary_color: form.primary_color,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
      published: form.published,
    });
    setSaving(false);
    onMsg(res.message);
  }

  const field = "w-full rounded-md border border-[#e0e0de] bg-white px-3 py-2 text-sm";

  return (
    <Card>
      <CardBody className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#91918e]">Branding &amp; SEO</h2>
        <div><Label>Name</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
        <div><Label>Tagline</Label><Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="Discover local Gibsonia businesses" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Hero title</Label><Input value={form.hero_title} onChange={(e) => set("hero_title", e.target.value)} /></div>
          <div>
            <Label>Brand color</Label>
            <div className="flex items-center gap-2">
              <Input value={form.primary_color} onChange={(e) => set("primary_color", e.target.value)} />
              <span aria-hidden className="h-9 w-9 shrink-0 rounded-md border border-[#e0e0de]" style={{ backgroundColor: /^#?[0-9a-fA-F]{6}$/.test(form.primary_color.trim()) ? `#${form.primary_color.replace("#", "")}` : "transparent" }} />
            </div>
          </div>
        </div>
        <div><Label>Hero subtitle</Label><Input value={form.hero_subtitle} onChange={(e) => set("hero_subtitle", e.target.value)} /></div>
        <div className="grid grid-cols-1 gap-3">
          <div><Label>Logo URL</Label><Input value={form.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://…/logo.png" /></div>
          <div><Label>Hero image URL</Label><Input value={form.hero_image_url} onChange={(e) => set("hero_image_url", e.target.value)} placeholder="https://…/hero.jpg" /></div>
        </div>
        <div><Label>Meta title</Label><Input value={form.meta_title} onChange={(e) => set("meta_title", e.target.value)} /></div>
        <div>
          <Label>Meta description</Label>
          <textarea className={field} rows={2} value={form.meta_description} onChange={(e) => set("meta_description", e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-[#37352f]">
          <input type="checkbox" className="h-4 w-4 rounded border-[#c9c9c7]" checked={form.published} onChange={(e) => set("published", e.target.checked)} />
          Published (visible to the public)
        </label>
        <Button type="button" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save branding"}</Button>
      </CardBody>
    </Card>
  );
}

function ImportCard({ directoryId, onMsg }: { directoryId: string; onMsg: (m: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function importCsv() {
    const file = fileRef.current?.files?.[0];
    if (!file) return onMsg("Choose a CSV file first.");
    setBusy(true);
    try {
      const text = await file.text();
      const res = await importListingsAction(directoryId, text);
      onMsg(res.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardBody className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#91918e]">Import businesses (CSV)</h2>
        <p className="text-xs text-[#5f5e5b]">
          Upload a CSV with a <span className="font-medium">business name</span> column (plus optional category, phone, website,
          address, city, state, zip, email, image, tier). Headers are matched automatically.
        </p>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="block w-full text-sm text-[#5f5e5b] file:mr-3 file:min-h-[40px] file:rounded-md file:border-0 file:bg-brand file:px-4 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark" />
        <Button type="button" variant="secondary" onClick={importCsv} disabled={busy}>{busy ? "Importing…" : "Import CSV"}</Button>
      </CardBody>
    </Card>
  );
}

function ListingsTable({
  directoryId,
  listings,
  pending,
  run,
  onMsg,
}: {
  directoryId: string;
  listings: DirectoryListing[];
  pending: boolean;
  run: (fn: () => void) => void;
  onMsg: (m: string) => void;
}) {
  return (
    <Card>
      <CardBody>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#91918e]">Listings ({listings.length})</h2>
        {listings.length === 0 ? (
          <p className="text-sm text-[#91918e]">No listings yet — import a CSV above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#ededec] text-left text-xs text-[#91918e]">
                  <th className="px-2 py-2 font-medium">Business</th>
                  <th className="px-2 py-2 font-medium">Category</th>
                  <th className="px-2 py-2 font-medium">Tier</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id} className="border-b border-[#f1f1ef] last:border-0">
                    <td className="px-2 py-2 font-medium text-[#37352f]">{l.business_name}</td>
                    <td className="px-2 py-2 text-[#5f5e5b]">{l.category ?? "—"}</td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => { setListingTierAction(directoryId, l.id, l.tier === "premium" ? "free" : "premium").then(() => onMsg("Tier updated.")); })}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${l.tier === "premium" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600"}`}
                      >
                        {l.tier}
                      </button>
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => { setListingStatusAction(directoryId, l.id, l.status === "published" ? "hidden" : "published").then(() => onMsg("Status updated.")); })}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${l.status === "published" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}
                      >
                        {l.status}
                      </button>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => { if (confirm(`Delete ${l.business_name}?`)) run(() => { deleteListingAction(directoryId, l.id).then(() => onMsg("Deleted.")); }); }}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
