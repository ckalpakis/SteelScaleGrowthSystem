"use client";

import { useState } from "react";

// Agency contact/quote form for the steelscalesystems.com landing page. Dark
// theme to match the hero. Posts to /api/agency-leads (emails the agency).
export function AgencyLeadForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name"),
      business: fd.get("business"),
      email: fd.get("email"),
      phone: fd.get("phone"),
      message: fd.get("message"),
      sms_consent: fd.get("sms_consent") === "on",
    };

    try {
      const res = await fetch("/api/agency-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? "Something went wrong.");
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-xl text-white">✓</div>
        <p className="text-lg font-bold text-white">Thanks — we got it!</p>
        <p className="mt-1 text-sm text-white/60">We&apos;ll get back to you within one business day.</p>
      </div>
    );
  }

  const field =
    "w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 transition focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-400/20";

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Name">
          <input name="name" required className={field} placeholder="Jane Smith" />
        </Field>
        <Field label="Business name">
          <input name="business" className={field} placeholder="Smith Roofing" />
        </Field>
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Email">
          <input name="email" type="email" required className={field} placeholder="jane@business.com" />
        </Field>
        <Field label="Phone">
          <input name="phone" className={field} placeholder="(412) 555-0123" />
        </Field>
      </div>
      <Field label="What are you looking for?">
        <textarea name="message" rows={3} className={field} placeholder="Tell us about your business and what you need..." />
      </Field>

      {/* SMS consent — unchecked by default; not required to submit. */}
      <label className="flex items-start gap-2.5">
        <input type="checkbox" name="sms_consent" className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/30 accent-brand" />
        <span className="text-xs leading-relaxed text-white/55">
          I agree to receive text messages from Steel Scale Systems about my inquiry. Message &amp; data
          rates may apply, message frequency varies, and I can reply STOP to opt out. See the{" "}
          <a href="/privacy" target="_blank" rel="noreferrer" className="underline hover:text-white">Privacy Policy</a>{" "}
          and{" "}
          <a href="/terms" target="_blank" rel="noreferrer" className="underline hover:text-white">Terms of Service</a>.
        </span>
      </label>

      {status === "error" && error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={status === "loading"}
        className="mt-1 inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-4 text-base font-bold uppercase tracking-wide text-white shadow-card-hover transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-60"
      >
        {status === "loading" ? "Sending..." : "Get My Free Mockup"}
      </button>
      <p className="text-center text-xs text-white/40">No spam — we&apos;ll only contact you about your project.</p>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">{label}</span>
      {children}
    </label>
  );
}
