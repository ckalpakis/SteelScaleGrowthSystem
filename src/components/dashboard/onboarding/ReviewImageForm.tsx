"use client";

import { useRef, useState, useTransition } from "react";

import { Button, Card, CardBody, Input, Label } from "@/components/ui";
import { saveReviewImageConfigAction, uploadReviewImageBaseAction } from "@/app/dashboard/onboarding/actions";
import type { TextPosition } from "@/lib/review-image";

interface InitialConfig {
  enabled: boolean;
  baseImageUrl: string | null;
  nameTemplate: string;
  textColor: string;
  fontSize: number;
  textPosition: TextPosition;
}

export function ReviewImageForm({ clientId, initial, previewUrl }: { clientId: string; initial: InitialConfig; previewUrl: string | null }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [nameTemplate, setNameTemplate] = useState(initial.nameTemplate);
  const [textColor, setTextColor] = useState(initial.textColor);
  const [fontSize, setFontSize] = useState(String(initial.fontSize));
  const [textPosition, setTextPosition] = useState<TextPosition>(initial.textPosition);
  const [baseImageUrl, setBaseImageUrl] = useState(initial.baseImageUrl);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return setMsg("Choose an image first.");
    const fd = new FormData();
    fd.set("image", file);
    startTransition(async () => {
      const res = await uploadReviewImageBaseAction(clientId, fd);
      setMsg(res.message);
      if (res.ok && res.url) setBaseImageUrl(res.url);
    });
  }

  function save() {
    startTransition(async () => {
      const res = await saveReviewImageConfigAction(clientId, {
        enabled,
        nameTemplate,
        textColor,
        fontSize: Number(fontSize),
        textPosition,
      });
      setMsg(res.message);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardBody className="space-y-5">
          <div>
            <Label>Base image</Label>
            <p className="mb-2 text-xs text-[#91918e]">PNG, JPEG, or WebP, up to 5 MB. A square image works best.</p>
            {baseImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={baseImageUrl} alt="Base" className="mb-2 max-h-40 rounded-lg border border-[#ededec] object-cover" />
            )}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="block w-full text-sm text-[#5f5e5b] file:mr-3 file:min-h-[40px] file:rounded-md file:border-0 file:bg-brand file:px-4 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark" />
            <Button type="button" variant="secondary" onClick={upload} disabled={pending} className="mt-2">
              {pending ? "Uploading…" : "Upload base image"}
            </Button>
          </div>

          <div>
            <Label htmlFor="tpl">Overlay text</Label>
            <Input id="tpl" value={nameTemplate} onChange={(e) => setNameTemplate(e.target.value)} placeholder="Thanks, {name}!" />
            <p className="mt-1 text-xs text-[#91918e]">
              Use <code>{"{name}"}</code> where the customer&apos;s first name should appear.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="color">Text color</Label>
              <div className="flex items-center gap-2">
                <Input id="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} placeholder="#FFFFFF" />
                <span aria-hidden className="h-9 w-9 shrink-0 rounded-md border border-[#e0e0de]" style={{ backgroundColor: /^#?[0-9a-fA-F]{6}$/.test(textColor.trim()) ? `#${textColor.replace("#", "")}` : "transparent" }} />
              </div>
            </div>
            <div>
              <Label htmlFor="size">Font size</Label>
              <Input id="size" type="number" min={12} max={300} value={fontSize} onChange={(e) => setFontSize(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Position</Label>
            <div className="flex gap-2">
              {(["top", "center", "bottom"] as TextPosition[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTextPosition(p)}
                  aria-pressed={textPosition === p}
                  className={`min-h-[40px] flex-1 rounded-md border px-3 text-sm font-medium capitalize transition-colors ${
                    textPosition === p ? "border-brand bg-brand text-white" : "border-[#e0e0de] bg-white text-[#37352f] hover:bg-[#f7f7f5]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-[#37352f]">
            <input type="checkbox" className="h-4 w-4 rounded border-[#c9c9c7]" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Enable personalized image on the first two texts
          </label>

          <div className="flex items-center gap-3">
            <Button type="button" onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save settings"}
            </Button>
            {msg && <span className="text-sm text-[#5f5e5b]">{msg}</span>}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#91918e]">Preview (sample name: Jordan)</h2>
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Preview" className="w-full rounded-lg border border-[#ededec]" />
          ) : (
            <p className="text-sm text-[#91918e]">
              Upload a base image, tick <span className="font-medium">Enable</span>, click{" "}
              <span className="font-medium">Save settings</span>, then reload this page to see the preview.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
