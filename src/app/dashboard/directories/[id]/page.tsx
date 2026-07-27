import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAgencyAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDirectoryById } from "@/lib/directory/data.server";
import { listAllListings } from "@/lib/directory/admin.server";
import { DirectoryManager } from "@/components/dashboard/directories/DirectoryManager";

export const dynamic = "force-dynamic";

export default async function DirectoryDetailPage({ params }: { params: { id: string } }) {
  await requireAgencyAdmin();
  const admin = createAdminClient();

  const directory = await getDirectoryById(admin, params.id);
  if (!directory) notFound();

  const listings = await listAllListings(admin, params.id);

  return (
    <div>
      <Link href="/dashboard/directories" className="text-sm text-[#5f5e5b] hover:text-[#37352f]">
        ← All directories
      </Link>
      <div className="mb-6 mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#37352f]">{directory.name}</h1>
          <p className="mt-1 text-sm text-[#91918e]">/directory/{directory.slug}</p>
        </div>
        <a href={`/directory/${directory.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-md border border-[#e0e0de] bg-white px-3.5 py-2 text-sm font-medium text-[#37352f] hover:bg-[#f7f7f5]">
          View directory ↗
        </a>
      </div>

      <DirectoryManager directory={directory} listings={listings} />
    </div>
  );
}
