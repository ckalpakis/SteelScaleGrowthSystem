"use client";

import { cn } from "@/components/ui";

// Lightweight CSS tooltip. Wraps any element; shows `label` on hover/focus.
// Purely presentational — for rich content use a popover instead.
export function Tooltip({
  label,
  children,
  side = "top",
  className,
}: {
  label: string;
  children: React.ReactNode;
  side?: "top" | "bottom";
  className?: string;
}) {
  return (
    <span className={cn("group/tt relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#37352f] px-2 py-1 text-xs font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100",
          side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
        )}
      >
        {label}
      </span>
    </span>
  );
}
