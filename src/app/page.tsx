import type { Metadata } from "next";
import Link from "next/link";

import { createAdminClient } from "@/lib/supabase/admin";
import { getPrimaryDirectory, getCategories } from "@/lib/directory/data.server";
import { DirectoryHeader, DirectoryFooter } from "@/components/directory/parts";
import { DirectoryHomeContent } from "@/components/directory/DirectoryHomeContent";

export const dynamic = "force-dynamic";

// The public front door is the primary directory (set PRIMARY_DIRECTORY_SLUG, or
// it falls back to the most recently published directory).
export async function generateMetadata(): Promise<Metadata> {
  const directory = await getPrimaryDirectory(createAdminClient());
  if (!directory) return { title: "Directory" };
  return {
    title: directory.meta_title || directory.name,
    description: directory.meta_description || directory.tagline || undefined,
  };
}

export default async function HomePage({ searchParams }: { searchParams: { q?: string } }) {
  const admin = createAdminClient();
  const directory = await getPrimaryDirectory(admin);

  // No published directory yet — show a minimal placeholder with the login.
  if (!directory) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f6f6f4] text-[#1f1f1f]">
        <header className="border-b border-black/10 bg-white">
          <div className="mx-auto flex max-w-6xl items-center px-5 py-4">
            <span className="text-lg font-bold">Directory</span>
            <Link href="/login" className="ml-auto rounded-md border border-black/15 px-3.5 py-1.5 text-sm font-medium hover:bg-black/[0.04]">
              Client login
            </Link>
          </div>
        </header>
        <main className="mx-auto flex max-w-2xl flex-1 items-center px-5 py-24 text-center">
          <p className="w-full text-[#6b6b6b]">The directory isn&apos;t published yet. Check back soon.</p>
        </main>
      </div>
    );
  }

  const categories = await getCategories(admin, directory.id);

  return (
    <div className="min-h-screen bg-[#f6f6f4] text-[#1f1f1f]">
      <DirectoryHeader directory={directory} categories={categories} homeHref="/" />
      <main>
        <DirectoryHomeContent directory={directory} q={searchParams.q} homeAction="/" />
      </main>
      <DirectoryFooter directory={directory} />
    </div>
  );
}
