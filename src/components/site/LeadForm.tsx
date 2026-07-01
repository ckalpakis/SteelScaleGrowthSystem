"use client";

import { useState } from "react";

interface Props {
  clientId: string;
  services: string[];
  source?: string;
  /** "dark" sits on a navy/photo hero; "light" sits on a white surface. */
  theme?: "dark" | "light";
  title?: string;
  subtitle?: string;
}

// Reusable quote/contact form. Posts to /api/leads. Accent from --brand.
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
    const budget = String(fd.get("estimate_value") ?? "").trim();

    const payload = {
      client_id: clientId,
      name: [first, last].filter(Boolean).join(" "),
      phone: fd.get("phone"),
      email: fd.get("email"),
      service_needed: fd.get("service_needed"),
      estimate_value: budget || null,
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
  const labelClass = dark ? "text-white/60" : "text-slate-500";
  const fieldClass = [
    "w-full rounded-xl border px-4 py-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 ring-client",
    dark
      ? "border-white/15 bg-white/5 text-white placeholder-white/40"
      : "border-slate-200 bg-white text-ink placeholder-slate-400",
  ].join(" ");

  if (status === "success") {
    return (
      <div className={`rounded-2xl p-8 text-center ${dark ? "bg-white/5 text-white" : "bg-client-tint"}`}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-client text-xl text-white">✓</div>
        <p className={`text-lg font-bold ${dark ? "text-white" : "text-ink"}`}>Thanks — we got it!</p>
        <p className={`mt-1 text-sm ${dark ? "text-white/70" : "text-slate-600"}`}>
          We&apos;ll reach out shortly to schedule your free estimate.
        </p>
      </div>
    );
  }

  return (
    <div>
      {title && (
        <div className="mb-5 text-center">
          <h3 className={`font-display text-2xl font-extrabold ${dark ? "text-white" : "text-ink"}`}>{title}</h3>
          {subtitle && <p className={`mt-1 text-sm ${dark ? "text-white/60" : "text-slate-500"}`}>{subtitle}</p>}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="First name" labelClass={labelClass}>
            <input name="first_name" required className={fieldClass} placeholder="Jane" />
          </Field>
          <Field label="Last name" labelClass={labelClass}>
            <input name="last_name" className={fieldClass} placeholder="Smith" />
          </Field>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Phone" labelClass={labelClass}>
            <input name="phone" className={fieldClass} placeholder="(412) 555-0123" />
          </Field>
          <Field label="Email" labelClass={labelClass}>
            <input name="email" type="email" className={fieldClass} placeholder="jane@example.com" />
          </Field>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Zip code" labelClass={labelClass}>
            <input name="zip" className={fieldClass} placeholder="15201" />
          </Field>
          <Field label="Service needed" labelClass={labelClass}>
            <select name="service_needed" className={fieldClass} defaultValue="">
              <option value="">Select a service</option>
              {services.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Project budget (optional)" labelClass={labelClass}>
          <select name="estimate_value" className={fieldClass} defaultValue="">
            <option value="">Not sure yet</option>
            <option value="1000">Under $1,000</option>
            <option value="3000">$1,000 – $5,000</option>
            <option value="7500">$5,000 – $10,000</option>
            <option value="17500">$10,000 – $25,000</option>
            <option value="30000">$25,000+</option>
          </select>
        </Field>
        <Field label="How can we help?" labelClass={labelClass}>
          <textarea name="message" rows={3} className={fieldClass} placeholder="Tell us about your project..." />
        </Field>

        {status === "error" && error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={status === "loading"}
          className="mt-1 inline-flex w-full items-center justify-center rounded-xl bg-client px-4 py-5 text-lg font-bold uppercase tracking-wide text-white shadow-card-hover transition hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-60"
        >
          {status === "loading" ? "Sending..." : "Request My Free Estimate"}
        </button>
        <p className={`text-center text-xs ${dark ? "text-white/40" : "text-slate-400"}`}>
          No spam — we&apos;ll only contact you about your project.
        </p>
      </form>
    </div>
  );
}

function Field({ label, labelClass, children }: { label: string; labelClass: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={`mb-1.5 block text-xs font-semibold uppercase tracking-wide ${labelClass}`}>{label}</span>
      {children}
    </label>
  );
}
