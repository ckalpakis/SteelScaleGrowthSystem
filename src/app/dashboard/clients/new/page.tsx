import Link from "next/link";
import { requireAgencyAdmin } from "@/lib/auth";
import { NewClientForm } from "@/components/dashboard/NewClientForm";

export default async function NewClientPage() {
  await requireAgencyAdmin();
  return (
    <div>
      <Link href="/dashboard/clients" className="text-sm text-gray-500 hover:text-gray-700">← Back to clients</Link>
      <div className="mt-3">
        <NewClientForm />
      </div>
    </div>
  );
}
