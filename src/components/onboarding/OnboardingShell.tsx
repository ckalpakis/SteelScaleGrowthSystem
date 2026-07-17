// Branded, mobile-first wrapper for the public onboarding pages. No dashboard
// chrome, no login. Client-facing terminology only.

export function OnboardingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#37352f]">
      <header className="border-b border-[#e9e9e7] bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-2.5 px-5 py-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-sm font-bold text-white">
            S
          </span>
          <span className="text-sm font-semibold">Steel Scale review system</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-5 sm:py-10">{children}</main>
      <footer className="mx-auto max-w-2xl px-5 pb-10 pt-2 text-center text-xs text-[#91918e]">
        Business setup · Steel Scale
      </footer>
    </div>
  );
}

export function OnboardingNotice({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-[#ededec] bg-white p-6 text-center shadow-[0_1px_2px_rgba(15,15,15,0.04)] sm:p-8">
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#f1f1ef] text-xl">
        ✉️
      </div>
      <h1 className="text-lg font-semibold text-[#37352f]">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#5f5e5b]">{body}</p>
    </div>
  );
}
