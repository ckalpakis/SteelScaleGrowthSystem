// Shown when a signed-in user's profile isn't linked to a client yet.
export function NotLinked() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Account not linked yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
        Your login isn&apos;t connected to a business account yet. Add a row to the
        <code className="mx-1 rounded bg-gray-100 px-1">profiles</code>
        table linking your user to a client to get started.
      </p>
    </div>
  );
}
