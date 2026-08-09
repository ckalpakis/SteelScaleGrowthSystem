import Link from "next/link";

// Simple, self-contained shell for legal pages (privacy, terms). Not linked in
// any nav — reachable by direct URL. Styles child HTML via arbitrary variants
// so we don't need the Tailwind typography plugin.
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-[#37352f]">
      <header className="border-b border-[#ededec]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-display text-lg font-extrabold uppercase tracking-tight text-[#37352f]">
            Steel Scale <span className="text-brand">Systems</span>
          </Link>
          <Link href="/" className="text-sm text-[#787774] transition-colors hover:text-[#37352f]">
            ← Back home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-[#9b9a97]">Last updated: {updated}</p>

        <div
          className="mt-8 space-y-4 text-[15px] leading-relaxed text-[#4b4a47]
            [&_a]:text-brand [&_a]:underline
            [&_h2]:mt-9 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[#37352f]
            [&_h3]:mt-5 [&_h3]:font-semibold [&_h3]:text-[#37352f]
            [&_strong]:font-semibold [&_strong]:text-[#37352f]
            [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6"
        >
          {children}
        </div>
      </main>

      <footer className="border-t border-[#ededec]">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm text-[#9b9a97]">
          <span>© {new Date().getFullYear()} Steel Scale Systems</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-[#37352f]">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#37352f]">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
