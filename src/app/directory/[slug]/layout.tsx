import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { getDirectoryBySlug, getCategories } from "@/lib/directory/data.server";
import { DirectoryHeader, DirectoryFooter } from "@/components/directory/parts";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const directory = await getDirectoryBySlug(createAdminClient(), params.slug, { publishedOnly: true });
  if (!directory) return { title: "Directory" };
  return {
    title: directory.meta_title || directory.name,
    description: directory.meta_description || directory.tagline || undefined,
  };
}

export default async function DirectoryLayout({ params, children }: { params: { slug: string }; children: React.ReactNode }) {
  const admin = createAdminClient();
  const directory = await getDirectoryBySlug(admin, params.slug, { publishedOnly: true });
  if (!directory) notFound();

  const categories = await getCategories(admin, directory.id);

  return (
    <div className="min-h-screen bg-[#f6f6f4] text-[#1f1f1f]">
      <DirectoryHeader directory={directory} categories={categories} />
      <main>{children}</main>
      <DirectoryFooter directory={directory} />
    </div>
  );
}
