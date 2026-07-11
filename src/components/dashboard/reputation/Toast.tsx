"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { cn } from "@/components/ui";

// =============================================================================
// Toast system for the Reputation module. Wrap a subtree in <ToastProvider> and
// call useToast().toast({...}) from any client component. Premium, minimal,
// accessible (role=status, aria-live), auto-dismissing with enter/exit motion.
// =============================================================================

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

const ToastContext = createContext<{ toast: (t: ToastInput) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((input: ToastInput) => {
    const item: ToastItem = { id: ++counter, variant: "success", ...input };
    setToasts((list) => [...list, item]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
        aria-live="polite"
        role="status"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const enter = requestAnimationFrame(() => setShown(true));
    const timer = setTimeout(() => {
      setShown(false);
      setTimeout(onDismiss, 200); // let the exit animation finish
    }, 4000);
    return () => {
      cancelAnimationFrame(enter);
      clearTimeout(timer);
    };
  }, [onDismiss]);

  const accent = {
    success: "text-green-600",
    error: "text-red-600",
    info: "text-brand",
  }[toast.variant];

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-[#ededec] bg-white p-3.5 shadow-[0_8px_30px_-8px_rgba(15,15,15,0.25)] transition-all duration-200",
        shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      )}
    >
      <span className={cn("mt-0.5 shrink-0", accent)}>
        <ToastIcon variant={toast.variant} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#37352f]">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-xs text-[#787774]">{toast.description}</p>}
      </div>
      <button
        onClick={() => {
          setShown(false);
          setTimeout(onDismiss, 200);
        }}
        className="shrink-0 rounded-md p-0.5 text-[#b9b9b7] transition-colors hover:text-[#787774]"
        aria-label="Dismiss notification"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

function ToastIcon({ variant }: { variant: ToastVariant }) {
  if (variant === "success")
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 12.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (variant === "error")
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4.5M12 16h.01" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" strokeLinecap="round" />
    </svg>
  );
}
