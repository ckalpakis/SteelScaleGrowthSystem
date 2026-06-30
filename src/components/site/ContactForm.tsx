"use client";

import { useState } from "react";

interface Props {
  clientId: string;
  services: string[];
}

// Public quote/contact form. Posts to /api/leads.
export function ContactForm({ clientId, services }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, client_id: clientId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Something went wrong.");
      }
      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-lg font-semibold text-green-800">Thanks — we got it!</p>
        <p className="mt-1 text-sm text-green-700">
          We&apos;ll reach out shortly to schedule your free estimate.
        </p>
      </div>
    );
  }

  const fieldClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 ring-client";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
          <input name="name" required className={fieldClass} placeholder="Jane Smith" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
          <input name="phone" className={fieldClass} placeholder="(412) 555-0123" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
        <input name="email" type="email" className={fieldClass} placeholder="jane@example.com" />
      </div>

      {services.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Service needed</label>
          <select name="service" className={fieldClass} defaultValue="">
            <option value="" disabled>
              Select a service
            </option>
            {services.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">How can we help?</label>
        <textarea name="message" rows={4} className={fieldClass} placeholder="Tell us about your project..." />
      </div>

      {status === "error" && error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="bg-client inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {status === "loading" ? "Sending..." : "Request Free Estimate"}
      </button>
    </form>
  );
}
