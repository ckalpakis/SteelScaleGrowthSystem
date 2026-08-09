import { cn } from "@/components/ui";

// Self-contained brand tile: a monogram on the integration's brand color. Avoids
// external image requests while still reading as a recognizable logo chip.
export function IntegrationLogo({
  color,
  monogram,
  size = "md",
}: {
  color: string;
  monogram: string;
  size?: "sm" | "md";
}) {
  const dims = size === "sm" ? "h-9 w-9 text-sm" : "h-11 w-11 text-base";
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-sm", dims)}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {monogram}
    </span>
  );
}
