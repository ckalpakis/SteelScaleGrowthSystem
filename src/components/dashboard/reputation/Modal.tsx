"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/ui";

// Reusable, accessible modal for the Reputation module. Matches the dashboard
// palette. Closes on backdrop click or Escape, animates in/out, moves focus
// into the dialog on open and restores it on close.
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [shown, setShown] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => {
      setShown(true);
      dialogRef.current?.focus();
    });
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      cancelAnimationFrame(raf);
      setShown(false);
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={cn("absolute inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity duration-200", shown ? "opacity-100" : "opacity-0")}
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-[#ededec] bg-white shadow-float outline-none transition-all duration-200",
          shown ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.98] opacity-0"
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#f0f0ef] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-[#37352f]">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-[#787774]">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 rounded-md p-1.5 text-[#9b9a97] transition-colors hover:bg-black/[0.05] hover:text-[#37352f]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-[#f0f0ef] bg-[#fafafa] px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}
