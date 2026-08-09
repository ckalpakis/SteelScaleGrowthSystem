import { createClient } from "@/lib/supabase/server";
import { ContactsTable } from "@/components/dashboard/reputation/contacts/ContactsTable";
import { CONTACT_SORT_COLUMNS, CONTACTS_PAGE_SIZE, type ReviewContact } from "@/lib/reputation";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; sort?: string; dir?: string; page?: string };
}) {
  // Sanitize the search term so it can't break the PostgREST or() filter.
  const q = (searchParams.q ?? "").replace(/[,()%*]/g, "").trim();
  const status = searchParams.status ?? "all";
  const sort = searchParams.sort && CONTACT_SORT_COLUMNS[searchParams.sort] ? searchParams.sort : "created_at";
  const dir = searchParams.dir === "asc" || searchParams.dir === "desc" ? searchParams.dir : sort === "created_at" ? "desc" : "asc";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const supabase = createClient();
  let query = supabase.from("review_contacts").select("*", { count: "exact" });

  if (q) {
    const term = `%${q}%`;
    query = query.or(`name.ilike.${term},email.ilike.${term},phone.ilike.${term},service.ilike.${term}`);
  }
  if (status !== "all") query = query.eq("status", status);

  query = query.order(CONTACT_SORT_COLUMNS[sort], { ascending: dir === "asc", nullsFirst: false });

  const from = (page - 1) * CONTACTS_PAGE_SIZE;
  const { data, count } = await query.range(from, from + CONTACTS_PAGE_SIZE - 1).returns<ReviewContact[]>();

  return (
    <ContactsTable
      contacts={data ?? []}
      total={count ?? 0}
      page={page}
      pageSize={CONTACTS_PAGE_SIZE}
      query={{ q, status, sort, dir }}
    />
  );
}
