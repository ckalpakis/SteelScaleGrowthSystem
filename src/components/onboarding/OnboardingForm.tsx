"use client";

import { useEffect, useRef, useState } from "react";

import { LOGO_ALLOWED_CONTENT_TYPES, LOGO_MAX_BYTES } from "@/lib/onboarding/config";

// -----------------------------------------------------------------------------
// Multi-step "Business setup" form. Mobile-first, keyboard accessible, inline
// validation, progress preserved in localStorage. On submit it POSTs a
// multipart body (fields + logo) to /api/onboard/submit and shows a generic
// success screen. NO integration/vendor terms appear anywhere in this UI.
// -----------------------------------------------------------------------------

type FollowUpCount = 0 | 1 | 2 | 3;

interface FormData {
  public_business_name: string;
  legal_business_name: string;
  legal_same_as_public: boolean;
  owner_first_name: string;
  primary_email: string;
  primary_phone: string;
  website_url: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  timezone: string;
  google_review_link: string;
  primary_brand_color: string;
  review_request_limit_14_days: string;
  follow_up_count: FollowUpCount;
  ask_for_referral: boolean;
  accuracy_confirmed: boolean;
}

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
];

const emptyForm = (defaultEmail: string): FormData => ({
  public_business_name: "",
  legal_business_name: "",
  legal_same_as_public: true,
  owner_first_name: "",
  primary_email: defaultEmail,
  primary_phone: "",
  website_url: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "United States",
  timezone: "America/New_York",
  google_review_link: "",
  primary_brand_color: "",
  review_request_limit_14_days: "8",
  follow_up_count: 2,
  ask_for_referral: true,
  accuracy_confirmed: false,
});

const STEPS = ["Business", "Location", "Google reviews", "Branding", "Review settings", "Review"];

type Errors = Partial<Record<keyof FormData | "logo", string>>;

function isHttpsUrl(v: string): boolean {
  try {
    return new URL(v.trim()).protocol === "https:";
  } catch {
    return false;
  }
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function OnboardingForm({ token, defaultEmail }: { token: string; defaultEmail: string }) {
  const storageKey = `onboarding:${token}`;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(() => emptyForm(defaultEmail));
  const [errors, setErrors] = useState<Errors>({});
  const [logo, setLogo] = useState<File | null>(null);
  const [logoName, setLogoName] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string>("");
  const submittedRef = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);

  // Restore saved progress (text fields only — a File can't be persisted).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<FormData>;
        setForm((f) => ({ ...f, ...parsed, accuracy_confirmed: false }));
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist progress as the client types.
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(form));
    } catch {
      /* ignore */
    }
  }, [form, storageKey]);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const legalName = form.legal_same_as_public ? form.public_business_name : form.legal_business_name;

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validateStep(s: number): Errors {
    const e: Errors = {};
    if (s === 0) {
      if (!form.public_business_name.trim()) e.public_business_name = "Enter your business name.";
      if (!form.legal_same_as_public && !form.legal_business_name.trim())
        e.legal_business_name = "Enter your legal business name, or check “Same as public name.”";
      if (!form.owner_first_name.trim()) e.owner_first_name = "Enter the owner's first name.";
      if (!isEmail(form.primary_email)) e.primary_email = "Enter a valid email address.";
      if (form.primary_phone.replace(/\D/g, "").length < 10) e.primary_phone = "Enter a valid phone number.";
      if (!isHttpsUrl(form.website_url)) e.website_url = "Enter your website starting with https://";
    }
    if (s === 1) {
      if (!form.timezone) e.timezone = "Choose a time zone.";
    }
    if (s === 2) {
      if (!isHttpsUrl(form.google_review_link)) e.google_review_link = "Paste a link starting with https://";
    }
    if (s === 3) {
      if (form.primary_brand_color && !/^#?[0-9a-fA-F]{6}$/.test(form.primary_brand_color.trim()))
        e.primary_brand_color = "Enter a 6-digit hex color like #1D4ED8.";
      if (logo) {
        if (logo.size > LOGO_MAX_BYTES) e.logo = "Logo must be 5 MB or smaller.";
        else if (!(LOGO_ALLOWED_CONTENT_TYPES as readonly string[]).includes(logo.type))
          e.logo = "Logo must be a PNG, JPEG, or WebP image.";
      }
    }
    if (s === 4) {
      const n = Number(form.review_request_limit_14_days);
      if (!Number.isInteger(n) || n < 0 || n > 500) e.review_request_limit_14_days = "Enter a number between 0 and 500.";
    }
    if (s === 5) {
      if (!form.accuracy_confirmed) e.accuracy_confirmed = "Please confirm the information is accurate.";
    }
    return e;
  }

  function next() {
    const e = validateStep(step);
    setErrors(e);
    if (Object.keys(e).length === 0) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }
  function goto(s: number) {
    setStep(s);
  }

  async function handleSubmit() {
    // Validate every step before final submit.
    for (let s = 0; s <= 5; s++) {
      const e = validateStep(s);
      if (Object.keys(e).length > 0) {
        setErrors(e);
        setStep(s);
        return;
      }
    }
    if (submittedRef.current || submitting) return; // prevent duplicate submits
    submittedRef.current = true;
    setSubmitting(true);
    setFormError("");

    try {
      const body = new FormData();
      body.set("token", token);
      body.set("public_business_name", form.public_business_name.trim());
      body.set("legal_business_name", (legalName || form.public_business_name).trim());
      body.set("owner_first_name", form.owner_first_name.trim());
      body.set("primary_email", form.primary_email.trim());
      body.set("primary_phone", form.primary_phone.trim());
      body.set("website_url", form.website_url.trim());
      body.set("address_line_1", form.address_line_1.trim());
      body.set("address_line_2", form.address_line_2.trim());
      body.set("city", form.city.trim());
      body.set("state", form.state.trim());
      body.set("postal_code", form.postal_code.trim());
      body.set("country", form.country.trim());
      body.set("timezone", form.timezone);
      body.set("google_review_link", form.google_review_link.trim());
      body.set("primary_brand_color", form.primary_brand_color.trim());
      body.set("review_request_limit_14_days", String(Number(form.review_request_limit_14_days)));
      body.set("follow_up_count", String(form.follow_up_count));
      body.set("ask_for_referral", String(form.ask_for_referral));
      if (logo) body.set("logo", logo);

      const res = await fetch("/api/onboard/submit", { method: "POST", body });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; code?: string };

      if (res.ok && json.ok) {
        try {
          localStorage.removeItem(storageKey);
        } catch {
          /* ignore */
        }
        setSubmitted(true);
        return;
      }

      // Failure — allow a retry.
      submittedRef.current = false;
      if (json.code === "validation") {
        setFormError("Some details need another look. Please review your answers and try again.");
        setStep(0);
      } else if (json.code === "invalid_link") {
        setFormError("This setup link is no longer valid. Please contact our team for a new one.");
      } else {
        setFormError("Something went wrong on our end. Please try again in a moment.");
      }
    } catch {
      submittedRef.current = false;
      setFormError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) return <SuccessScreen />;

  return (
    <div ref={topRef}>
      <ProgressHeader step={step} />

      <div className="rounded-xl border border-[#ededec] bg-white p-5 shadow-[0_1px_2px_rgba(15,15,15,0.04)] sm:p-7">
        {step === 0 && <BusinessStep form={form} set={set} errors={errors} legalName={legalName} />}
        {step === 1 && <LocationStep form={form} set={set} errors={errors} />}
        {step === 2 && <GoogleStep form={form} set={set} errors={errors} />}
        {step === 3 && (
          <BrandingStep form={form} set={set} errors={errors} logoName={logoName} onLogo={(f) => { setLogo(f); setLogoName(f?.name ?? ""); setErrors((e) => ({ ...e, logo: undefined })); }} />
        )}
        {step === 4 && <ReviewSettingsStep form={form} set={set} errors={errors} />}
        {step === 5 && (
          <ReviewStep form={form} legalName={legalName} logoName={logoName} errors={errors} set={set} goto={goto} />
        )}

        {formError && (
          <p role="alert" className="mt-5 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </p>
        )}

        <div className="mt-7 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={back}
            disabled={step === 0 || submitting}
            className="min-h-[44px] rounded-md px-4 text-sm font-medium text-[#5f5e5b] transition-colors hover:bg-black/[0.04] disabled:invisible"
          >
            ← Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="min-h-[44px] rounded-md bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="min-h-[44px] rounded-md bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {submitting ? "Finishing setup…" : "Finish setup"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ sub-parts

function ProgressHeader({ step }: { step: number }) {
  const pct = Math.round(((step + 1) / STEPS.length) * 100);
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-base font-semibold text-[#37352f]">Business setup</h1>
        <span className="text-xs font-medium text-[#91918e]" aria-live="polite">
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-[#ededec]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Setup progress"
      >
        <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}
function Field({ id, label, error, hint, required, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[#37352f]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-[#91918e]">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

const inputCls =
  "w-full min-h-[44px] rounded-md border border-[#e0e0de] bg-white px-3 py-2.5 text-[15px] text-[#37352f] placeholder-[#b9b9b7] transition-colors focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15";

type Setter = <K extends keyof FormData>(key: K, value: FormData[K]) => void;

function BusinessStep({ form, set, errors, legalName }: { form: FormData; set: Setter; errors: Errors; legalName: string }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#91918e]">Your business</legend>
      <Field id="public_business_name" label="Public business name" required error={errors.public_business_name} hint="How customers know you.">
        <input
          id="public_business_name"
          className={inputCls}
          value={form.public_business_name}
          onChange={(e) => set("public_business_name", e.target.value)}
          autoComplete="organization"
          aria-describedby={errors.public_business_name ? "public_business_name-error" : "public_business_name-hint"}
        />
      </Field>

      <Field id="legal_business_name" label="Legal business name" error={errors.legal_business_name}>
        <input
          id="legal_business_name"
          className={inputCls}
          value={legalName}
          disabled={form.legal_same_as_public}
          onChange={(e) => set("legal_business_name", e.target.value)}
          aria-describedby={errors.legal_business_name ? "legal_business_name-error" : undefined}
        />
        <label className="mt-2 flex items-center gap-2 text-sm text-[#5f5e5b]">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-[#c9c9c7]"
            checked={form.legal_same_as_public}
            onChange={(e) => set("legal_same_as_public", e.target.checked)}
          />
          Same as public name
        </label>
      </Field>

      <Field id="owner_first_name" label="Owner first name" required error={errors.owner_first_name}>
        <input
          id="owner_first_name"
          className={inputCls}
          value={form.owner_first_name}
          onChange={(e) => set("owner_first_name", e.target.value)}
          autoComplete="given-name"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="primary_email" label="Primary contact email" required error={errors.primary_email}>
          <input
            id="primary_email"
            type="email"
            inputMode="email"
            className={inputCls}
            value={form.primary_email}
            onChange={(e) => set("primary_email", e.target.value)}
            autoComplete="email"
          />
        </Field>
        <Field id="primary_phone" label="Primary contact phone" required error={errors.primary_phone}>
          <input
            id="primary_phone"
            type="tel"
            inputMode="tel"
            className={inputCls}
            value={form.primary_phone}
            onChange={(e) => set("primary_phone", e.target.value)}
            autoComplete="tel"
            placeholder="(555) 123-4567"
          />
        </Field>
      </div>

      <Field id="website_url" label="Website" required error={errors.website_url} hint="Include https://">
        <input
          id="website_url"
          type="url"
          inputMode="url"
          className={inputCls}
          value={form.website_url}
          onChange={(e) => set("website_url", e.target.value)}
          autoComplete="url"
          placeholder="https://yourbusiness.com"
        />
      </Field>
    </fieldset>
  );
}

function LocationStep({ form, set, errors }: { form: FormData; set: Setter; errors: Errors }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#91918e]">Location</legend>
      <p className="text-sm text-[#5f5e5b]">Please enter your business address exactly as it should appear. We won&apos;t guess it for you.</p>

      <Field id="address_line_1" label="Address" error={errors.address_line_1}>
        <input id="address_line_1" className={inputCls} value={form.address_line_1} onChange={(e) => set("address_line_1", e.target.value)} autoComplete="address-line1" />
      </Field>
      <Field id="address_line_2" label="Address line 2 (optional)" error={errors.address_line_2}>
        <input id="address_line_2" className={inputCls} value={form.address_line_2} onChange={(e) => set("address_line_2", e.target.value)} autoComplete="address-line2" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="city" label="City">
          <input id="city" className={inputCls} value={form.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" />
        </Field>
        <Field id="state" label="State / Province">
          <input id="state" className={inputCls} value={form.state} onChange={(e) => set("state", e.target.value)} autoComplete="address-level1" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="postal_code" label="Postal code">
          <input id="postal_code" className={inputCls} value={form.postal_code} onChange={(e) => set("postal_code", e.target.value)} autoComplete="postal-code" />
        </Field>
        <Field id="country" label="Country">
          <input id="country" className={inputCls} value={form.country} onChange={(e) => set("country", e.target.value)} autoComplete="country-name" />
        </Field>
      </div>
      <Field id="timezone" label="Time zone" required error={errors.timezone}>
        <select id="timezone" className={inputCls} value={form.timezone} onChange={(e) => set("timezone", e.target.value)}>
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace("America/", "").replace("Pacific/", "").replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </Field>
    </fieldset>
  );
}

function GoogleStep({ form, set, errors }: { form: FormData; set: Setter; errors: Errors }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#91918e]">Google reviews</legend>
      <div className="rounded-lg bg-[#f7f7f5] p-4 text-sm leading-relaxed text-[#5f5e5b]">
        <p className="font-medium text-[#37352f]">Where to find your Google review link</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Search your business name on Google.</li>
          <li>In your business panel, click <span className="font-medium">“Ask for reviews.”</span></li>
          <li>Google shows a short link — copy it and paste it below.</li>
        </ol>
        <p className="mt-2 text-xs text-[#91918e]">You can update this later with our team if needed.</p>
      </div>
      <Field id="google_review_link" label="Google review link" required error={errors.google_review_link} hint="Must start with https://">
        <input
          id="google_review_link"
          type="url"
          inputMode="url"
          className={inputCls}
          value={form.google_review_link}
          onChange={(e) => set("google_review_link", e.target.value)}
          placeholder="https://g.page/r/…/review"
        />
      </Field>
    </fieldset>
  );
}

function BrandingStep({
  form,
  set,
  errors,
  logoName,
  onLogo,
}: {
  form: FormData;
  set: Setter;
  errors: Errors;
  logoName: string;
  onLogo: (f: File | null) => void;
}) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#91918e]">Branding</legend>
      <Field id="logo" label="Logo" error={errors.logo} hint="PNG, JPEG, or WebP · up to 5 MB">
        <input
          id="logo"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="block w-full text-sm text-[#5f5e5b] file:mr-3 file:min-h-[44px] file:rounded-md file:border-0 file:bg-brand file:px-4 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark"
          onChange={(e) => onLogo(e.target.files?.[0] ?? null)}
        />
        {logoName && <p className="mt-1 text-xs text-[#5f5e5b]">Selected: {logoName}</p>}
      </Field>
      <Field id="primary_brand_color" label="Brand color (optional)" error={errors.primary_brand_color} hint="Hex code like #1D4ED8">
        <div className="flex items-center gap-3">
          <input
            id="primary_brand_color"
            className={inputCls}
            value={form.primary_brand_color}
            onChange={(e) => set("primary_brand_color", e.target.value)}
            placeholder="#1D4ED8"
          />
          <span
            aria-hidden
            className="h-9 w-9 shrink-0 rounded-md border border-[#e0e0de]"
            style={{ backgroundColor: /^#?[0-9a-fA-F]{6}$/.test(form.primary_brand_color.trim()) ? `#${form.primary_brand_color.replace("#", "")}` : "transparent" }}
          />
        </div>
      </Field>
    </fieldset>
  );
}

function ReviewSettingsStep({ form, set, errors }: { form: FormData; set: Setter; errors: Errors }) {
  return (
    <fieldset className="space-y-5">
      <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#91918e]">Review settings</legend>
      <Field
        id="review_request_limit_14_days"
        label="Review requests allowed every 14 days"
        required
        error={errors.review_request_limit_14_days}
        hint="A cap so customers aren't over-messaged."
      >
        <input
          id="review_request_limit_14_days"
          type="number"
          inputMode="numeric"
          min={0}
          max={500}
          className={inputCls}
          value={form.review_request_limit_14_days}
          onChange={(e) => set("review_request_limit_14_days", e.target.value)}
        />
      </Field>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-[#37352f]">Follow-up messages</span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Follow-up count">
          {[0, 1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => set("follow_up_count", n as FollowUpCount)}
              aria-pressed={form.follow_up_count === n}
              className={`min-h-[44px] min-w-[56px] rounded-md border px-4 text-sm font-medium transition-colors ${
                form.follow_up_count === n
                  ? "border-brand bg-brand text-white"
                  : "border-[#e0e0de] bg-white text-[#37352f] hover:bg-[#f7f7f5]"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-[#91918e]">How many gentle reminders to send if there&apos;s no response.</p>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-[#37352f]">
          Ask for a referral if the customer already left a review?
        </span>
        <div className="flex gap-2" role="group" aria-label="Ask for a referral">
          {[
            { label: "Yes", value: true },
            { label: "No", value: false },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => set("ask_for_referral", opt.value)}
              aria-pressed={form.ask_for_referral === opt.value}
              className={`min-h-[44px] min-w-[72px] rounded-md border px-4 text-sm font-medium transition-colors ${
                form.ask_for_referral === opt.value
                  ? "border-brand bg-brand text-white"
                  : "border-[#e0e0de] bg-white text-[#37352f] hover:bg-[#f7f7f5]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </fieldset>
  );
}

function Row({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#f1f1ef] py-2.5 last:border-0">
      <div className="min-w-0">
        <div className="text-xs text-[#91918e]">{label}</div>
        <div className="truncate text-sm text-[#37352f]">{value || "—"}</div>
      </div>
      <button type="button" onClick={onEdit} className="shrink-0 text-xs font-medium text-brand hover:underline">
        Edit
      </button>
    </div>
  );
}

function ReviewStep({
  form,
  legalName,
  logoName,
  errors,
  set,
  goto,
}: {
  form: FormData;
  legalName: string;
  logoName: string;
  errors: Errors;
  set: Setter;
  goto: (s: number) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#91918e]">Review &amp; finish</h2>
        <p className="mt-1 text-sm text-[#5f5e5b]">Please check everything below. You can edit any section.</p>
      </div>

      <div className="rounded-lg border border-[#ededec]">
        <div className="px-4">
          <Row label="Public business name" value={form.public_business_name} onEdit={() => goto(0)} />
          <Row label="Legal business name" value={legalName} onEdit={() => goto(0)} />
          <Row label="Owner first name" value={form.owner_first_name} onEdit={() => goto(0)} />
          <Row label="Contact email" value={form.primary_email} onEdit={() => goto(0)} />
          <Row label="Contact phone" value={form.primary_phone} onEdit={() => goto(0)} />
          <Row label="Website" value={form.website_url} onEdit={() => goto(0)} />
          <Row
            label="Address"
            value={[form.address_line_1, form.address_line_2, form.city, form.state, form.postal_code, form.country].filter(Boolean).join(", ")}
            onEdit={() => goto(1)}
          />
          <Row label="Time zone" value={form.timezone} onEdit={() => goto(1)} />
          <Row label="Google review link" value={form.google_review_link} onEdit={() => goto(2)} />
          <Row label="Logo" value={logoName || "Not uploaded"} onEdit={() => goto(3)} />
          <Row label="Brand color" value={form.primary_brand_color} onEdit={() => goto(3)} />
          <Row label="Review requests / 14 days" value={form.review_request_limit_14_days} onEdit={() => goto(4)} />
          <Row label="Follow-up messages" value={String(form.follow_up_count)} onEdit={() => goto(4)} />
          <Row label="Ask for referral" value={form.ask_for_referral ? "Yes" : "No"} onEdit={() => goto(4)} />
        </div>
      </div>

      <label className="flex items-start gap-2.5 rounded-lg bg-[#f7f7f5] p-4">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-[#c9c9c7]"
          checked={form.accuracy_confirmed}
          onChange={(e) => set("accuracy_confirmed", e.target.checked)}
          aria-describedby={errors.accuracy_confirmed ? "accuracy-error" : undefined}
        />
        <span className="text-sm text-[#5f5e5b]">
          I confirm this information is accurate. I understand that submitting starts the setup of my review system, and
          that changes afterward may require help from the support team.
        </span>
      </label>
      {errors.accuracy_confirmed && (
        <p id="accuracy-error" role="alert" className="text-xs font-medium text-red-600">
          {errors.accuracy_confirmed}
        </p>
      )}
    </div>
  );
}

function SuccessScreen() {
  return (
    <div className="rounded-xl border border-[#ededec] bg-white p-6 text-center shadow-[0_1px_2px_rgba(15,15,15,0.04)] sm:p-10">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-2xl">✅</div>
      <h1 className="text-lg font-semibold text-[#37352f]">Thanks — we&apos;ve got everything we need</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#5f5e5b]">
        Thanks — we received your information and are configuring your Steel Scale review system. We&apos;ll contact you
        if anything else is needed.
      </p>
    </div>
  );
}
