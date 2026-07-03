import { requireClient, isAgencyAdmin } from "@/lib/auth";
import { businessName } from "@/lib/types";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { email, client, settings } = await requireClient();
  const admin = isAgencyAdmin(email);
  const name = client ? businessName(client, settings) : admin ? "Agency Admin" : "Dashboard";

  return (
    <div className="min-h-screen bg-white text-[#37352f] lg:flex">
      <Sidebar
        name={name}
        email={email}
        isAdmin={admin}
        hasClient={Boolean(client)}
        slug={client?.slug ?? null}
      />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-12 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
