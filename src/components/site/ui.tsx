import Link from "next/link";

// =============================================================================
// Shared site design primitives — one cohesive system for the whole template.
// =============================================================================

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("container-x", className)}>{children}</div>;
}

type SectionTone = "white" | "light" | "navy" | "tint";

const toneClass: Record<SectionTone, string> = {
  white: "bg-white text-ink",
  light: "bg-slate-50 text-ink",
  navy: "bg-ink text-white",
  tint: "bg-client-tint text-ink",
};

// Consistent vertical rhythm + background tone for every section.
export function Section({
  tone = "white",
  className,
  children,
  id,
}: {
  tone?: SectionTone;
  className?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className={cn("section", toneClass[tone], className)}>
      <Container>{children}</Container>
    </section>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("eyebrow", className)}>{children}</p>;
}

// Section header block: eyebrow + large title + supporting line.
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  invert = false,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  align?: "center" | "left";
  invert?: boolean;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2
        className={cn(
          "mt-3 text-3xl font-extrabold leading-[1.1] sm:text-4xl md:text-[2.6rem]",
          invert ? "text-white" : "text-ink"
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={cn("mt-4 text-lg leading-relaxed", invert ? "text-white/70" : "text-slate-600")}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

type ButtonProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "white";
  size?: "md" | "lg";
  className?: string;
  external?: boolean;
};

// Link-styled button used throughout the site.
export function Button({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
  external,
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold uppercase tracking-wide transition duration-200 active:scale-[0.98]";
  const sizes = { md: "px-5 py-3 text-sm", lg: "px-7 py-4 text-sm" };
  const variants = {
    primary: "bg-client text-white shadow-card hover:shadow-card-hover hover:brightness-110",
    secondary: "border-2 border-ink/15 bg-white text-ink hover:border-ink/30",
    ghost: "text-ink hover:bg-slate-100",
    white: "bg-white text-ink shadow-card hover:shadow-card-hover",
  };
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      className={cn(base, sizes[size], variants[variant], className)}
    >
      {children}
    </Link>
  );
}

// Premium card surface.
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-100 bg-white p-7 shadow-card hover-lift",
        className
      )}
    >
      {children}
    </div>
  );
}
