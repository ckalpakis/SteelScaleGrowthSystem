"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Card, CardBody, Input, Label, Textarea } from "@/components/ui";
import { ImageUploader, ImageUrlHelper } from "@/components/dashboard/ImageUploader";
import type { SettingsState } from "@/app/dashboard/actions";
import type { ClientSettings } from "@/lib/types";

const initialState: SettingsState = { ok: false };

type SettingsAction = (state: SettingsState, formData: FormData) => Promise<SettingsState>;

export function SettingsForm({
  settings,
  clientName,
  action,
  clientId,
  reviewAutomation = false,
}: {
  settings: ClientSettings | null;
  clientName: string;
  action: SettingsAction;
  /** Set when an agency admin edits a client, so image uploads target it. */
  clientId?: string;
  /** Tier 2+ clients see the automated review-request controls. */
  reviewAutomation?: boolean;
}) {
  const [state, formAction] = useFormState(action, initialState);

  // Images are controlled so the uploader can update them; they post via their
  // own named inputs inside <ImageUploader>.
  const [logoUrl, setLogoUrl] = useState(settings?.logo_url ?? "");
  const [faviconUrl, setFaviconUrl] = useState(settings?.favicon_url ?? "");
  const [heroUrl, setHeroUrl] = useState(settings?.hero_image_url ?? "");

  const servicesJson = JSON.stringify(settings?.service_details ?? [], null, 2);
  const galleryJson = JSON.stringify(settings?.gallery ?? [], null, 2);
  const statsJson = JSON.stringify(settings?.stats ?? [], null, 2);
  const processJson = JSON.stringify(settings?.process_steps ?? [], null, 2);
  const testimonialsJson = JSON.stringify(settings?.testimonials ?? [], null, 2);
  const financingJson = JSON.stringify(settings?.financing ?? [], null, 2);
  const faqsJson = JSON.stringify(settings?.faqs ?? [], null, 2);
  const badgeLogosJson = JSON.stringify(settings?.badge_logos ?? [], null, 2);

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#37352f]">Business Settings</h1>
        <p className="mt-1 text-sm text-[#787774]">
          Everything here powers your public website and review requests. Changes go
          live as soon as you save.
        </p>
      </div>

      {/* Business info */}
      <Section title="Business info">
        <Field label="Business name" name="business_name" defaultValue={settings?.business_name ?? clientName} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone number" name="phone" defaultValue={settings?.phone} />
          <Field label="Email (lead notifications)" name="email" type="email" defaultValue={settings?.email} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Address" name="address" defaultValue={settings?.address} placeholder="123 Main St, City, ST" />
          <Field label="Hours" name="hours" defaultValue={settings?.hours} placeholder="Mon–Sat: 7am–7pm" />
        </div>
      </Section>

      {/* Branding & hero */}
      <Section title="Branding & hero">
        <ImageUploader name="logo_url" label="Logo" kind="logo" value={logoUrl} onChange={setLogoUrl} clientId={clientId} />
        <div>
          <ImageUploader name="favicon_url" label="Favicon (browser tab icon)" kind="favicon" value={faviconUrl} onChange={setFaviconUrl} clientId={clientId} />
          <p className="mt-1 text-xs text-gray-400">
            Shown in the browser tab and bookmarks. Use a square image (a .png, .ico, or .svg at 32×32 or larger).
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Brand color (accent)</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                name="brand_color"
                defaultValue={settings?.brand_color ?? "#1e3a8a"}
                className="h-10 w-16 cursor-pointer rounded border border-gray-300"
              />
              <span className="text-sm text-gray-500">{settings?.brand_color ?? "#1e3a8a"}</span>
            </div>
          </div>
          <div>
            <Label>Secondary color (dark sections)</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                name="secondary_color"
                defaultValue={settings?.secondary_color ?? "#0c2340"}
                className="h-10 w-16 cursor-pointer rounded border border-gray-300"
              />
              <span className="text-sm text-gray-500">{settings?.secondary_color ?? "#0c2340"}</span>
            </div>
          </div>
        </div>
        <ImageUploader name="hero_image_url" label="Hero background image" kind="hero" value={heroUrl} onChange={setHeroUrl} clientId={clientId} />
        <Field label="Tagline (hero eyebrow)" name="tagline" defaultValue={settings?.tagline} placeholder="Pittsburgh's Trusted Roofers" />
        <Field label="Primary location (for SEO)" name="primary_location" defaultValue={settings?.primary_location} placeholder="Pittsburgh, PA" />
        <Field label="Hero headline" name="hero_headline" defaultValue={settings?.hero_headline} placeholder="#1 Roofing Contractor in Pittsburgh, PA" />
        <TextareaField label="Hero subheadline" name="hero_subheadline" defaultValue={settings?.hero_subheadline} rows={2} />
        <Field label="Promo text (optional nav offer)" name="promo_text" defaultValue={settings?.promo_text} placeholder="Free Inspection This Month" />
      </Section>

      {/* Homepage section headings — makes the template niche-agnostic */}
      <Section title="Homepage headings">
        <p className="text-xs text-gray-400">
          Wrap a word in *asterisks* to accent it in your brand color, e.g.{" "}
          <code className="rounded bg-gray-100 px-1">Every *Shingle*</code>. Customize these to fit any niche
          (roofing, HVAC, paving, landscaping, etc.).
        </p>
        <Field
          label="Our Work heading"
          name="work_heading"
          defaultValue={settings?.work_heading}
          placeholder="See The Difference In Every *Shingle*"
        />
        <Field
          label="Services heading"
          name="services_heading"
          defaultValue={settings?.services_heading}
          placeholder="*Full-Service* Roofing & Exterior Solutions"
        />
        <TextareaField
          label="Services subheading"
          name="services_subheading"
          defaultValue={settings?.services_subheading}
          rows={2}
          hint="The supporting line under the services heading."
        />
      </Section>

      {/* Services */}
      <Section title="Services">
        <TextareaField
          label="Quick services list (one per line)"
          name="services"
          defaultValue={(settings?.services ?? []).join("\n")}
          rows={4}
          hint="Used for the lead-form dropdown and as a fallback if Detailed services is empty."
        />
        <JsonField
          label="Detailed services — JSON (drives the per-service pages)"
          name="service_details"
          defaultValue={servicesJson}
          hint='Array of {"slug","name","description","image_url"}. The slug becomes /services/<slug>.'
        />
        <ImageUrlHelper kind="service" label="Upload a service photo → copy its URL into the JSON above" clientId={clientId} />
      </Section>

      {/* Service areas */}
      <Section title="Service areas">
        <TextareaField
          label="Service areas (one per line)"
          name="service_areas"
          defaultValue={(settings?.service_areas ?? []).join("\n")}
          rows={4}
          hint="Each becomes a local SEO landing page at /areas/<city>."
        />
        <Field
          label="Primary service area (single, optional)"
          name="service_area"
          defaultValue={settings?.service_area}
          placeholder="Greater Pittsburgh, PA"
        />
      </Section>

      {/* Gallery */}
      <Section title="Past work gallery">
        <JsonField
          label="Gallery — JSON"
          name="gallery"
          defaultValue={galleryJson}
          hint='Array of {"url","caption"}. Use real job photos, not stock.'
        />
        <ImageUrlHelper kind="gallery" label="Upload a job photo → copy its URL into the JSON above" clientId={clientId} />
      </Section>

      {/* Trust */}
      <Section title="Why choose us">
        <TextareaField
          label="Value props (one per line)"
          name="value_props"
          defaultValue={(settings?.value_props ?? []).join("\n")}
          rows={3}
          hint="Shown in the trust strip and on service pages. 3 works best."
        />
        <TextareaField
          label="Trust badges — text (one per line)"
          name="badges"
          defaultValue={(settings?.badges ?? []).join("\n")}
          rows={3}
          hint="Shown as seal icons if no logo images are set below. e.g. Licensed & Insured, BBB Accredited, GAF Certified"
        />
        <JsonField
          label="Trust badge logos — JSON (images)"
          name="badge_logos"
          defaultValue={badgeLogosJson}
          hint='Array of {"url","label"}. When set, real logo images replace the text badges. Use the uploader below to get URLs.'
        />
        <ImageUrlHelper kind="badge" label="Upload a certification logo → copy its URL into the JSON above" clientId={clientId} />
      </Section>

      {/* Premium content sections */}
      <Section title="Homepage sections (premium)">
        <JsonField
          label="Stats — JSON"
          name="stats"
          defaultValue={statsJson}
          hint='Array of {"value","label"} — e.g. {"value":"5,000+","label":"Roofs Installed"}. Leave [] to auto-generate from your rating/reviews.'
        />
        <JsonField
          label="Process steps — JSON"
          name="process_steps"
          defaultValue={processJson}
          hint='Array of {"title","description"} shown as the timeline. Leave [] for a sensible default flow.'
        />
        <JsonField
          label="Testimonials — JSON"
          name="testimonials"
          defaultValue={testimonialsJson}
          hint='Array of {"quote","name","location","rating"}. Use real reviews. Leave [] to hide the section.'
        />
        <JsonField
          label="Financing options — JSON"
          name="financing"
          defaultValue={financingJson}
          hint='Array of {"title","description"}. Leave [] to hide the financing section.'
        />
        <JsonField
          label="FAQs — JSON"
          name="faqs"
          defaultValue={faqsJson}
          hint='Array of {"question","answer"}. Leave [] to hide the FAQ section.'
        />
      </Section>

      {/* About */}
      <Section title="About">
        <Field label="About headline" name="about_headline" defaultValue={settings?.about_headline} />
        <TextareaField label="About text" name="about_text" defaultValue={settings?.about_text} rows={5} />
      </Section>

      {/* Reviews & social */}
      <Section title="Reviews & social">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Google rating (e.g. 4.9)" name="rating" defaultValue={settings?.rating?.toString() ?? null} />
          <Field label="Review count (e.g. 196)" name="review_count" defaultValue={settings?.review_count?.toString() ?? null} />
        </div>
        <Field label="Google review link" name="google_review_link" defaultValue={settings?.google_review_link} placeholder="https://g.page/r/.../review" />
        <Field label="Facebook URL" name="facebook_url" defaultValue={settings?.facebook_url} />
        <Field label="Instagram URL" name="instagram_url" defaultValue={settings?.instagram_url} />
        <Field label="Google Business URL" name="google_business_url" defaultValue={settings?.google_business_url} />
      </Section>

      {/* Review automation — Tier 2+ only */}
      {reviewAutomation && (
      <Section title="Automated review requests">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="auto_review_enabled"
            defaultChecked={settings?.auto_review_enabled ?? false}
            className="mt-1 h-4 w-4 rounded border-gray-300"
          />
          <span>
            <span className="block text-sm font-medium text-gray-800">
              Automatically request a Google review when I mark a job “Won”
            </span>
            <span className="block text-xs text-gray-400">
              Sends the customer a review request by email and text a few days after the job.
              Requires your Google review link above.
            </span>
          </span>
        </label>
        <div className="max-w-xs">
          <Field
            label="Days to wait after “Won”"
            name="auto_review_delay_days"
            type="number"
            defaultValue={(settings?.auto_review_delay_days ?? 3).toString()}
          />
        </div>
        <TextareaField
          label="Custom message (optional)"
          name="review_request_message"
          defaultValue={settings?.review_request_message}
          rows={3}
          hint="Placeholders: {{name}} = customer first name, {{business}} = your business, {{link}} = your Google review link. Leave blank to use a proven default."
        />
      </Section>
      )}

      {/* Status + save */}
      <div className="sticky bottom-0 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
        <div className="text-sm">
          {state.error && <span className="text-red-600">⚠ {state.error}</span>}
          {state.ok && !state.error && <span className="text-green-600">✓ Saved — your site is updated.</span>}
        </div>
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save changes"}
    </Button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardBody className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
        {children}
      </CardBody>
    </Card>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue ?? ""} placeholder={placeholder} required={required} />
    </div>
  );
}

function TextareaField({
  label,
  name,
  defaultValue,
  rows = 3,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
  hint?: string;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} rows={rows} defaultValue={defaultValue ?? ""} />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function JsonField({
  label,
  name,
  defaultValue,
  hint,
}: {
  label: string;
  name: string;
  defaultValue: string;
  hint?: string;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Textarea
        id={name}
        name={name}
        rows={8}
        defaultValue={defaultValue}
        spellCheck={false}
        className="font-mono text-xs"
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
