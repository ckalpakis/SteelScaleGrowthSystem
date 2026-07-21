"use client";

import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui";
import { lookupPhonesAction, type PhoneLookupState } from "@/app/dashboard/tools/actions";
import type { LineType, LookupResult } from "@/lib/phone-lookup/lookup.server";

const LINE_TYPE_STYLE: Record<LineType, string> = {
  mobile: "bg-green-50 text-green-700 border-green-200",
  landline: "bg-red-50 text-red-700 border-red-200",
  voip: "bg-amber-50 text-amber-700 border-amber-200",
  other: "bg-gray-100 text-gray-700 border-gray-200",
  unknown: "bg-gray-100 text-gray-500 border-gray-200",
};

const LINE_TYPE_LABEL: Record<LineType, string> = {
  mobile: "Mobile",
  landline: "Landline",
  voip: "VoIP",
  other: "Other",
  unknown: "Unknown",
};

export function PhoneLookupTool({ disabled }: { disabled?: boolean }) {
  const [text, setText] = useState("");
  const [state, setState] = useState<PhoneLookupState | null>(null);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function run() {
    setCopied(false);
    startTransition(async () => {
      const res = await lookupPhonesAction(text);
      setState(res);
    });
  }

  const results = useMemo(() => state?.results ?? [], [state]);
  const summary = useMemo(() => tally(results), [results]);
  const mobiles = useMemo(() => results.filter((r) => r.lineType === "mobile" && r.e164).map((r) => r.e164 as string), [results]);

  async function copyMobiles() {
    try {
      await navigator.clipboard.writeText(mobiles.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="numbers" className="mb-1.5 block text-sm font-medium text-[#37352f]">
          Phone numbers
        </label>
        <textarea
          id="numbers"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled || pending}
          rows={6}
          placeholder={"One per line (or comma-separated)\n(412) 555-0100\n+1 555 333 4444"}
          className="w-full rounded-md border border-[#e0e0de] bg-white px-3 py-2.5 font-mono text-sm text-[#37352f] placeholder-[#b9b9b7] focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15 disabled:bg-[#f7f7f5]"
        />
        <div className="mt-2 flex items-center gap-3">
          <Button onClick={run} disabled={disabled || pending || text.trim().length === 0}>
            {pending ? "Checking…" : "Check numbers"}
          </Button>
          {state?.truncated && <span className="text-xs text-amber-700">Only the first batch was checked.</span>}
        </div>
      </div>

      {state?.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Chip className={LINE_TYPE_STYLE.mobile}>{summary.mobile} mobile</Chip>
            <Chip className={LINE_TYPE_STYLE.landline}>{summary.landline} landline</Chip>
            <Chip className={LINE_TYPE_STYLE.voip}>{summary.voip} VoIP</Chip>
            {summary.other > 0 && <Chip className={LINE_TYPE_STYLE.other}>{summary.other} other</Chip>}
            {summary.unknown > 0 && <Chip className={LINE_TYPE_STYLE.unknown}>{summary.unknown} invalid/unknown</Chip>}
            {mobiles.length > 0 && (
              <button type="button" onClick={copyMobiles} className="ml-auto rounded-md border border-[#e0e0de] bg-white px-2.5 py-1 font-medium text-[#37352f] hover:bg-[#f7f7f5]">
                {copied ? "Copied ✓" : `Copy ${mobiles.length} mobile ${mobiles.length === 1 ? "number" : "numbers"}`}
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border border-[#ededec]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#ededec] bg-[#fafafa] text-left text-xs text-[#91918e]">
                  <th className="px-3 py-2 font-medium">Input</th>
                  <th className="px-3 py-2 font-medium">Normalized</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Carrier</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={`${r.input}-${i}`} className="border-b border-[#f1f1ef] last:border-0">
                    <td className="px-3 py-2 font-mono text-[#5f5e5b]">{r.input}</td>
                    <td className="px-3 py-2 font-mono text-[#37352f]">{r.e164 ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Chip className={LINE_TYPE_STYLE[r.lineType]}>
                        {LINE_TYPE_LABEL[r.lineType]}
                        {r.rawType && r.lineType === "other" ? ` (${r.rawType})` : ""}
                      </Chip>
                      {r.error && <span className="ml-2 text-xs text-red-600">{r.error}</span>}
                    </td>
                    <td className="px-3 py-2 text-[#5f5e5b]">{r.carrierName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}>{children}</span>;
}

function tally(results: LookupResult[]): Record<LineType, number> {
  const t: Record<LineType, number> = { mobile: 0, landline: 0, voip: 0, other: 0, unknown: 0 };
  for (const r of results) t[r.lineType] += 1;
  return t;
}
