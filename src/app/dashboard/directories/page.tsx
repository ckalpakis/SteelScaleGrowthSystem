import Link from "next/link";

import { requireAgencyAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { listDirectories } from "@/lib/directory/data.server";
import { DirectoryCreateForm } from "@/components/dashboard/directories/DirectoryCreateForm";

export const dynamic = "force-dynamic";

// Admin-only: list + create local business directories.
export default async function DirectoriesPage() {
  await requireAgencyAdmin();
  const directories = await listDirectories(createAdminClient());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#37352f]">Directories</h1>
        <p className="mt-1 text-sm text-[#5f5e5b]">Local business directories — your lead‑gen sites.</p>
      </div>

      <DirectoryCreateForm />

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#91918e]">Your directories</h2>
        {directories.length === 0 ? (
          <div className="rounded-xl border border-[#ededec] bg-white p-6 text-center text-sm text-[#91918e]">No directories yet.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#ededec] bg-white">
            <div className="divide-y divide-[#f1f1ef]">
              {directories.map((d) => (
                <Link key={d.id} href={`/dashboard/directories/${d.id}`} className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-[#f7f7f5]">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-[#37352f]">{d.name}</div>
                    <div className="mt-0.5 text-xs text-[#91918e]">/directory/{d.slug}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${d.published ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {d.published ? "Published" : "Draft"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
