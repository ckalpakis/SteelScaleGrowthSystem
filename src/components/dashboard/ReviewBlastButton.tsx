"use client";

import { useFormState, useFormStatus } from "react-dom";
import { sendReviewBlast, type ReviewBlastState } from "@/app/dashboard/actions";

const initial: ReviewBlastState = {};

// Bulk-sends a review request to every past customer who hasn't been asked yet.
export function ReviewBlastButton() {
  const [state, action] = useFormState(sendReviewBlast, initial);
  return (
    <form action={action} className="flex items-center gap-3">
      <SubmitButton />
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
      {state.count != null && (
        <span className="text-xs font-medium text-green-600">
          Sent {state.count} request{state.count === 1 ? "" : "s"}.
        </span>
      )}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
      title="Email/text a Google review request to every won customer who hasn't been asked yet"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-amber-400">
        <path d="M12 2l2.9 6.3 6.9.7-5.1 4.7 1.4 6.8L12 17.8 5.9 20.5l1.4-6.8L2.2 9l6.9-.7L12 2z" />
      </svg>
      {pending ? "Sending..." : "Request Reviews"}
    </button>
  );
}
