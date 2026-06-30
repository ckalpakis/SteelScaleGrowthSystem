import Link from "next/link";
import { requireClient, isAgencyAdmin } from "@/lib/auth";
import { businessName } from "@/lib/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { email, client, settings } = await requireClient();
  const admin = isAgencyAdmin(email);
  const name = client ? businessName(client, settings) : admin ? "Agency Admin" : "Dashboard";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-bold text-gray-900">
              {name}
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              {client && (
                <>
                  <NavLink href="/dashboard">Overview</NavLink>
                  <NavLink href="/dashboard/leads">Leads</NavLink>
                  <NavLink href="/dashboard/settings">Settings</NavLink>
                </>
              )}
              {admin && <NavLink href="/dashboard/clients">Clients</NavLink>}
              {client && (
                <NavLink href={`/site/${client.slug}`} external>
                  View site ↗
                </NavLink>
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

function NavLink({
  href,
  children,
  external,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      className="rounded-md px-3 py-1.5 text-gray-600 hover:bg-gray-100"
    >
      {children}
    </Link>
  );
}
