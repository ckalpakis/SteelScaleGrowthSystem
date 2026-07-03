import { forwardRef } from "react";

// Tiny, dependency-free UI primitives shared across the app. Intentionally
// minimal — expand as the product grows.

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Card({ className, ...props }: DivProps) {
  return (
    <div
      className={cn("rounded-lg border border-[#ededec] bg-white shadow-[0_1px_2px_rgba(15,15,15,0.04)]", className)}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: DivProps) {
  return <div className={cn("p-5", className)} {...props} />;
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-md border border-[#e0e0de] bg-white px-3 py-2 text-sm text-[#37352f] placeholder-[#b9b9b7]",
          "transition-colors focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15",
          className
        )}
        {...props}
      />
    );
  }
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-md border border-[#e0e0de] bg-white px-3 py-2 text-sm text-[#37352f] placeholder-[#b9b9b7]",
        "transition-colors focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15",
        className
      )}
      {...props}
    />
  );
});

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium text-[#37352f]", className)}
      {...props}
    />
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  const variants = {
    primary: "bg-brand text-white shadow-[0_1px_2px_rgba(15,15,15,0.1)] hover:bg-brand-dark disabled:opacity-60",
    secondary: "bg-white text-[#37352f] border border-[#e0e0de] hover:bg-[#f7f7f5]",
    ghost: "text-[#5f5e5b] hover:bg-black/[0.05]",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        className
      )}
      {...props}
    />
  );
}
