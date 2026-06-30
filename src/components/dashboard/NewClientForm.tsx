"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Card, CardBody, Input, Label, Textarea } from "@/components/ui";
import { createClientAction } from "@/app/dashboard/clients/actions";
import type { SettingsState } from "@/app/dashboard/actions";

const initial: SettingsState = { ok: false };

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function NewClientForm() {
  const [state, formAction] = useFormState(createClientAction, initial);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const effectiveSlug = slugTouched ? slug : slugify(name);

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New client</h1>
        <p className="mt-1 text-sm text-gray-500">
          Creates the business, its website, and (optionally) its login — all at once. You can fill in the rest of the
          website content right after.
        </p>
      </div>

      <Card>
        <CardBody className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Business</h2>
          <div>
            <Label htmlFor="business_name">Business name *</Label>
            <Input id="business_name" name="business_name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Three Rivers Roofing" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="slug">URL slug *</Label>
              <Input
                id="slug"
                name="slug"
                required
                value={effectiveSlug}
                onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
                placeholder="three-rivers-roofing"
              />
              <p className="mt-1 text-xs text-gray-400">Their site: /site/{effectiveSlug || "…"}</p>
            </div>
            <div>
              <Label htmlFor="domain">Custom domain (optional)</Label>
              <Input id="domain" name="domain" placeholder="threeriversroofing.com" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="primary_location">Primary location (SEO)</Label>
              <Input id="primary_location" name="primary_location" placeholder="Pittsburgh, PA" />
            </div>
            <div>
              <Label>Brand color</Label>
              <input type="color" name="brand_color" defaultValue="#1e3a8a" className="h-10 w-16 cursor-pointer rounded border border-gray-300" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" placeholder="(412) 555-0199" />
            </div>
            <div>
              <Label htmlFor="email">Lead notification email</Label>
              <Input id="email" name="email" type="email" placeholder="owner@business.com" />
            </div>
          </div>
          <div>
            <Label htmlFor="services">Services (one per line)</Label>
            <Textarea id="services" name="services" rows={3} placeholder={"Roof Replacement\nRoof Repair\nGutters\nSiding"} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Client login (optional)</h2>
          <p className="text-xs text-gray-400">Leave blank to create the login later from the client&apos;s page.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="owner_email">Owner email</Label>
              <Input id="owner_email" name="owner_email" type="email" placeholder="owner@business.com" />
            </div>
            <div>
              <Label htmlFor="owner_password">Temp password</Label>
              <Input id="owner_password" name="owner_password" type="text" placeholder="At least 6 characters" />
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
        <div className="text-sm">{state.error && <span className="text-red-600">⚠ {state.error}</span>}</div>
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Creating..." : "Create client"}</Button>;
}
