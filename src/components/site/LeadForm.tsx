"use client";

import { useState } from "react";

interface Props {
  clientId: string;
  services: string[];
  /** Where the lead was captured, stored on the lead for attribution. */
  source?: string;
  /** "dark" sits on a dark hero card; "light" sits on a white section. */
  theme?: "dark" | "light";
  /** Heading + subheading shown above the fields. */
  title?: string;
  subtitle?: string;
}

// Reusable quote/contact form used in the hero and on the contact page.
// Posts to /api/leads. Accent (button, focus ring) comes from the --brand
// CSS variable set by the site layout.
export function LeadForm({
  clientId,
  services,
  source = "website",
  theme = "light",
  title,
  subtitle,
}: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    const form = e.currentTarget;
    const fd = new FormData(form);
    const first = String(fd.get("first_name") ?? "").trim();
    const last = String(fd.get("last_name") ?? "").trim();
    const zip = String(fd.get("zip") ?? "").trim();
    const details = String(fd.get("message") ?? "").trim();

    const payload = {
      client_id: clientId,
      name: [first, last].filter(Boolean).join(" "),
      phone: fd.get("phone"),
      email: fd.get("email"),
      service_needed: fd.get("service_needed"),
      message: zip ? `ZIP: ${zip}${details ? `\n\n${details}` : ""}` : details,
      source,
    };

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const dark = theme === "dark";
  const labelClass = dark ? "text-gray-300" : "text-gray-600";
  const fieldClass = [
    "w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 ring-client",
    dark
      ? "border-white/15 bg-white/10 text-white placeholder-gray-400"
      : "border-gray-300 bg-white text-gray-900 placeholder-gray-400",
  ].join(" ");

  if (status === "success") {
    return (
      <div
        className={`rounded-xl border p-6 text-center ${
          dark ? "border-white/15 bg-white/5 text-white" : "border-green-200 bg-green-50"
        }`}
      >
        <p className={`text-lg font-semibold ${dark ? "text-white" : "text-green-800"}`}>
          Thanks — we got it!
        </p>
        <p className={`mt-1 text-sm ${dark ? "text-gray-300" : "text-green-700"}`}>
          We&apos;ll reach out shortly to schedule your free estimate.
        </p>
      </div>
    );
  }

  return (
    <div>
      {title && (
        <div className="mb-4 text-center">
          <h3 className={`text-xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>{title}</h3>
          {subtitle && (
            <p className={`mt-1 text-sm ${dark ? "text-gray-300" : "text-gray-500"}`}>{subtitle}</p>
          )}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="First name" labelClass={labelClass}>
            <input name="first_name" required className={fieldClass} placeholder="Jane" />
          </Field>
          <Field label="Last name" labelClass={labelClass}>
            <input name="last_name" className={fieldClass} placeholder="Smith" />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Phone" labelClass={labelClass}>
            <input name="phone" className={fieldClass} placeholder="(412) 555-0123" />
          </Field>
          <Field label="Email" labelClass={labelClass}>
            <input name="email" type="email" className={fieldClass} placeholder="jane@example.com" />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Zip code" labelClass={labelClass}>
            <input name="zip" className={fieldClass} placeholder="15201" />
          </Field>
          <Field label="Service needed" labelClass={labelClass}>
            <select name="service_needed" className={fieldClass} defaultValue="">
              <option value="">Select a service</option>
              {services.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="How can we help?" labelClass={labelClass}>
          <textarea name="message" rows={3} className={fieldClass} placeholder="Tell us about your project..." />
        </Field>

        {status === "error" && error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={status === "loading"}
          className="bg-client mt-1 inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
        >
          {status === "loading" ? "Sending..." : "Request Free Estimate"}
        </button>
        <p className={`text-center text-xs ${dark ? "text-gray-400" : "text-gray-400"}`}>
          No spam. We&apos;ll only use your info to contact you about your project.
        </p>
      </form>
    </div>
  );
}

function Field({
  label,
  labelClass,
  children,
}: {
  label: string;
  labelClass: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={`mb-1 block text-xs font-medium uppercase tracking-wide ${labelClass}`}>
        {label}
      </span>
      {children}
    </label>
  );
}
