import { requireClient } from "@/lib/auth";
import { Button, Card, CardBody, Input, Label, Textarea } from "@/components/ui";
import { updateSettings } from "@/app/dashboard/actions";

export default async function SettingsPage() {
  const { client } = await requireClient();

  if (!client) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-gray-600">Your account isn&apos;t linked to a business yet.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Business Settings</h1>
      <p className="mt-1 text-sm text-gray-500">
        These details power your public website and review requests.
      </p>

      <form action={updateSettings} className="mt-6 space-y-6">
        <Card>
          <CardBody className="space-y-4">
            <Field label="Business name" name="business_name" defaultValue={client.business_name} required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone number" name="phone" defaultValue={client.phone} />
              <Field label="Email (lead notifications)" name="email" type="email" defaultValue={client.email} />
            </div>
            <Field label="Service area" name="service_area" defaultValue={client.service_area} placeholder="Greater Pittsburgh, PA" />
            <div>
              <Label>Services (comma-separated)</Label>
              <Textarea
                name="services"
                rows={2}
                defaultValue={(client.services ?? []).join(", ")}
                placeholder="Roof Repair, Gutters, Siding"
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Branding</h2>
            <Field label="Logo URL" name="logo_url" defaultValue={client.logo_url} placeholder="https://..." />
            <div>
              <Label>Brand color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  name="brand_color"
                  defaultValue={client.brand_color ?? "#1e3a8a"}
                  className="h-10 w-16 cursor-pointer rounded border border-gray-300"
                />
                <span className="text-sm text-gray-500">{client.brand_color}</span>
              </div>
            </div>
            <Field label="Hero headline" name="hero_headline" defaultValue={client.hero_headline} />
            <div>
              <Label>Hero subheadline</Label>
              <Textarea name="hero_subheadline" rows={2} defaultValue={client.hero_subheadline ?? ""} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Reviews</h2>
            <Field
              label="Google review link"
              name="google_review_link"
              defaultValue={client.google_review_link}
              placeholder="https://g.page/r/.../review"
            />
          </CardBody>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">Save changes</Button>
        </div>
      </form>
    </div>
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
  defaultValue: string | null;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}
