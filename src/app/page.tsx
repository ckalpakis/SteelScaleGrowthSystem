import Link from "next/link";

// Marketing/landing page for the Steel City Growth System itself (the product
// the agency sells). Not client-facing.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand">
        Steel City Growth System
      </p>
      <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
        Websites + CRM for local businesses
      </h1>
      <p className="mt-5 max-w-xl text-lg text-gray-600">
        A branded website, lead capture, a simple pipeline CRM, notes, and review
        requests — everything a local business needs to turn clicks into customers.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/site/demo"
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
        >
          View demo site
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          Client login
        </Link>
      </div>
    </main>
  );
}
