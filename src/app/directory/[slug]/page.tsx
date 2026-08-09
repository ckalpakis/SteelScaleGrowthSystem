import { notFound } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { getDirectoryBySlug } from "@/lib/directory/data.server";
import { DirectoryHomeContent } from "@/components/directory/DirectoryHomeContent";

export const dynamic = "force-dynamic";

export default async function DirectoryHome({ params, searchParams }: { params: { slug: string }; searchParams: { q?: string } }) {
  const directory = await getDirectoryBySlug(createAdminClient(), params.slug, { publishedOnly: true });
  if (!directory) notFound();
  return <DirectoryHomeContent directory={directory} q={searchParams.q} />;
}
