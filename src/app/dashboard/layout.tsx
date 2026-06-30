import Link from "next/link";
import { requireClient } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { email, client } = await requireClient();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-bold text-gray-900">
              {client?.business_name ?? "Dashboard"}
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-1.5 text-gray-600 hover:bg-gray-100"
              >
                Leads
              </Link>
              <Link
                href="/dashboard/settings"
                className="rounded-md px-3 py-1.5 text-gray-600 hover:bg-gray-100"
              >
                Settings
              </Link>
              {client && (
                <Link
                  href={`/site/${client.slug}`}
                  target="_blank"
                  className="rounded-md px-3 py-1.5 text-gray-600 hover:bg-gray-100"
                >
                  View site ↗
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 sm:inline">{email}</span>
            <form action="/auth/signout" method="post">
              <button className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
