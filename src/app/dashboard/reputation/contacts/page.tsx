import { Button } from "@/components/ui";
import { PageHeader, Panel, Toolbar, StatusPill, PlusIcon } from "@/components/dashboard/reputation/ui";

// Placeholder sample rows — no business logic yet.
const CONTACTS = [
  { name: "Karen Mitchell", email: "karen.m@example.com", phone: "(412) 555-0142", last: "Jul 2", status: "Reviewed" as const },
  { name: "Dave Robertson", email: "dave.r@example.com", phone: "(412) 555-0198", last: "Jun 28", status: "Requested" as const },
  { name: "Priya Shah", email: "priya.s@example.com", phone: "(412) 555-0111", last: "Jun 24", status: "New" as const },
  { name: "Tom Becker", email: "tom.b@example.com", phone: "(412) 555-0176", last: "Jun 20", status: "Reviewed" as const },
];

const TONE = { Reviewed: "green", Requested: "amber", New: "blue" } as const;

export default function ReputationContactsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description="People you can request reviews from."
        action={
          <>
            <Button variant="secondary">Import</Button>
            <Button>
              <PlusIcon className="mr-1.5 h-4 w-4" /> Add contact
            </Button>
          </>
        }
      />

      <Toolbar placeholder="Search contacts by name, email, or phone…">
        <Button variant="secondary" className="shrink-0">Filters</Button>
      </Toolbar>

      <Panel className="overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[#f0f0ef] bg-[#fafafa] text-left text-xs uppercase tracking-wide text-[#9b9a97]">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="hidden px-5 py-3 font-medium sm:table-cell">Email</th>
                <th className="hidden px-5 py-3 font-medium md:table-cell">Phone</th>
                <th className="hidden px-5 py-3 font-medium lg:table-cell">Last request</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0ef]">
              {CONTACTS.map((c) => (
                <tr key={c.email} className="transition-colors hover:bg-[#fafafa]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                        {c.name.charAt(0)}
                      </span>
                      <span className="font-medium text-[#37352f]">{c.name}</span>
                    </div>
                  </td>
                  <td className="hidden px-5 py-3 text-[#787774] sm:table-cell">{c.email}</td>
                  <td className="hidden px-5 py-3 text-[#787774] md:table-cell">{c.phone}</td>
                  <td className="hidden px-5 py-3 text-[#787774] lg:table-cell">{c.last}</td>
                  <td className="px-5 py-3">
                    <StatusPill tone={TONE[c.status]}>{c.status}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
