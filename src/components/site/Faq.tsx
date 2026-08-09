"use client";

import { useState } from "react";
import type { Faq } from "@/lib/types";

// Minimal, professional accordion with generous spacing.
export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-5xl divide-y divide-slate-200">
      {faqs.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="py-2">
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-5 py-7 text-left"
            >
              <span className="text-xl font-bold text-ink sm:text-2xl">{f.question}</span>
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 text-2xl text-client transition-transform duration-300 ${
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
                <p className="pb-7 pr-14 text-lg leading-relaxed text-slate-600 sm:text-xl">{f.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
