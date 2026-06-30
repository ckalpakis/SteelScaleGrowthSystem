import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, Button, Card, CardBody, Textarea } from "@/components/ui";
import { StatusSelect } from "@/components/dashboard/StatusSelect";
import { ReviewRequestButton } from "@/components/dashboard/ReviewRequestButton";
import { addNote, deleteNote } from "@/app/dashboard/actions";
import { stageFor, type Lead, type LeadNote } from "@/lib/types";
import { buildReviewMessage, buildSmsHref } from "@/lib/review";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const { client } = await requireClient();
  if (!client) notFound();

  const supabase = createClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", params.id)
    .single<Lead>();

  if (!lead) notFound();

  const { data: notes } = await supabase
    .from("lead_notes")
    .select("*")
    .eq("lead_id", lead.id)
    .order("created_at", { ascending: false })
    .returns<LeadNote[]>();

  const stage = stageFor(lead.status);
  const reviewMessage = buildReviewMessage(client, lead);
  const smsHref = buildSmsHref(lead.phone, reviewMessage);

  // Bind server actions to this lead.
  const addNoteAction = addNote.bind(null, lead.id);

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
        ← Back to leads
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{lead.name}</h1>
          <Badge className={stage.badgeClass}>{stage.label}</Badge>
        </div>
        <StatusSelect leadId={lead.id} status={lead.status} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Lead details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardBody>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Details
              </h2>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Detail label="Phone" value={lead.phone} href={lead.phone ? `tel:${lead.phone}` : undefined} />
                <Detail label="Email" value={lead.email} href={lead.email ? `mailto:${lead.email}` : undefined} />
                <Detail label="Service" value={lead.service} />
                <Detail label="Received" value={new Date(lead.created_at).toLocaleString()} />
              </dl>
              {lead.message && (
                <div className="mt-4">
                  <dt className="text-xs font-medium uppercase text-gray-400">Message</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{lead.message}</dd>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Notes */}
          <Card>
            <CardBody>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Notes
              </h2>
              <form action={addNoteAction} className="space-y-2">
                <Textarea name="body" rows={3} placeholder="Add a note about this lead..." required />
                <div className="flex justify-end">
                  <Button type="submit">Add note</Button>
                </div>
              </form>

              <ul className="mt-4 space-y-3">
                {(notes ?? []).length === 0 && (
                  <li className="text-sm text-gray-400">No notes yet.</li>
                )}
                {(notes ?? []).map((note) => {
                  const deleteAction = deleteNote.bind(null, note.id, lead.id);
                  return (
                    <li key={note.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <p className="whitespace-pre-wrap text-sm text-gray-800">{note.body}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {new Date(note.created_at).toLocaleString()}
                        </span>
                        <form action={deleteAction}>
                          <button className="text-xs text-gray-400 hover:text-red-600">
                            Delete
                          </button>
                        </form>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>
        </div>

        {/* Actions sidebar */}
        <div className="space-y-6">
          <Card>
            <CardBody>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Review request
              </h2>
              <ReviewRequestButton
                message={reviewMessage}
                smsHref={smsHref}
                hasReviewLink={Boolean(client.google_review_link)}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null;
  href?: string;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-800">
        {value ? (
          href ? (
            <a href={href} className="text-brand hover:underline">
              {value}
            </a>
          ) : (
            value
          )
        ) : (
          "—"
        )}
      </dd>
    </div>
  );
}
