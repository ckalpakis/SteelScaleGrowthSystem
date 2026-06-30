"use client";

import { useState } from "react";
import type { Faq } from "@/lib/types";

// Minimal, professional accordion with generous spacing.
export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl divide-y divide-slate-200">
      {faqs.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="py-2">
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 py-5 text-left"
            >
              <span className="text-lg font-semibold text-ink">{f.question}</span>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-client transition-transform duration-300 ${
                  isOpen ? "rotate-45" : ""
                }`}
              >
                +
              </span>
            </button>
            <div
              className={`grid transition-all duration-300 ease-out ${
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="pb-5 pr-12 leading-relaxed text-slate-600">{f.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
