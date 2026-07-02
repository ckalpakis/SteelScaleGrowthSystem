import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

// =============================================================================
// Steel Scale Systems — product marketing / landing page.
// This is the agency-facing front door (not a client site). It explains what
// the platform does and routes users to the client dashboard login.
// =============================================================================

export const metadata = {
  title: "Steel Scale Systems — Websites + CRM for Local Businesses",
  description:
    "Steel Scale Systems builds branded, high-converting websites with a built-in CRM, lead capture, and automated review requests for local service businesses.",
};

const FEATURES = [
  {
    title: "Branded Website",
    body: "A fast, mobile-first website built around your brand, colors, and services — on your own custom domain.",
    icon: GlobeIcon,
  },
  {
    title: "Lead Capture",
    body: "Every quote form and call-to-action feeds straight into your pipeline, so no opportunity slips through.",
    icon: InboxIcon,
  },
  {
    title: "Instant Notifications",
    body: "Get an email the moment a new lead comes in — reply first and win the job before your competitors.",
    icon: BellIcon,
  },
  {
    title: "Simple CRM Pipeline",
    body: "Track every lead from New → Contacted → Estimate → Won with a clean, drag-free pipeline anyone can use.",
    icon: BoardIcon,
  },
  {
    title: "Notes & Follow-ups",
    body: "Keep the full history on every customer — calls, estimates, and reminders all in one place.",
    icon: NoteIcon,
  },
  {
    title: "Automated Reviews",
    body: "Send one-tap review requests to happy customers and grow the 5-star reputation that drives more calls.",
    icon: StarIcon,
  },
];

const REVIEWS = [
  { quote: "Started getting leads through the site in the first week. Everything's in one place now.", name: "Matt — Tegrity Renovations" },
  { quote: "Looks better than companies 10x our size, and the lead tracking is a game changer.", name: "Owner — My Pittsburgh Roofing" },
];

const WORK = [
  { src: "https://steelscale.xyz/assets/lavish.png", name: "Lavish" },
  { src: "https://steelscale.xyz/assets/marvesta.png", name: "Marvesta" },
];

const STEPS = [
  { n: "01", title: "We build your site", body: "Your branded website and CRM are set up and launched on your domain — no tech work on your end." },
  { n: "02", title: "You capture leads", body: "Visitors request quotes and you're notified instantly, with every lead organized automatically." },
  { n: "03", title: "You close & grow", body: "Work your pipeline, collect reviews, and turn more clicks into paying customers month after month." },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-ink">
      {/* ---------------------------------------------------------------- Nav */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <BrandLogo />
          <div className="flex items-center gap-2">
            <Link
              href="/site/demo"
              className="rounded-lg px-4 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              View Demo
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-card transition hover:bg-brand-dark"
            >
              Client Login
            </Link>
          </div>
        </div>
      </header>

      {/* --------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="pointer-events-none absolute inset-0" style={heroGlow} />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
          {/* Left: copy + social proof + CTAs */}
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-white/60">
              Steel Scale Systems
            </p>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl xl:text-6xl">
              Websites &amp; CRM that turn local clicks into{" "}
              <span className="text-blue-400">paying customers</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
              We build local service businesses a branded, high-converting website with lead capture,
              a simple CRM pipeline, instant lead alerts, and automated review requests — everything you
              need to grow, in one system.
            </p>

            {/* 5-star social proof */}
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-3">
                <Stars5 />
                <span className="text-sm font-bold text-white">5.0</span>
                <span className="text-sm text-white/60">from the businesses we build for</span>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {REVIEWS.map((r) => (
                  <figure key={r.name}>
                    <blockquote className="text-sm leading-relaxed text-white/85">“{r.quote}”</blockquote>
                    <figcaption className="mt-1.5 text-xs font-semibold text-white/50">{r.name}</figcaption>
                  </figure>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/site/demo"
                className="rounded-xl bg-brand px-7 py-4 text-base font-bold uppercase tracking-wide text-white shadow-card-hover transition hover:-translate-y-0.5 hover:bg-brand-dark"
              >
                View Demo Site
              </Link>
              <Link
                href="/login"
                className="rounded-xl border-2 border-white/30 px-7 py-4 text-base font-bold uppercase tracking-wide text-white transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                Client Login
              </Link>
            </div>
          </div>

          {/* Right: explainer video */}
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-white/10 shadow-float">
              <video
                className="block w-full bg-black"
                controls
                playsInline
                preload="metadata"
              >
                <source src="/hero-demo.mp4" type="video/mp4" />
                Your browser doesn&apos;t support embedded video.
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- Features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand">Everything in one place</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-5xl">
            The complete growth system for local businesses
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            No stitching together five tools. Steel Scale Systems is your website and your CRM, built to work together.
          </p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ title, body, icon: Icon }) => (
            <div
              key={title}
              className="group rounded-2xl border border-slate-100 bg-white p-7 shadow-card transition hover:-translate-y-1 hover:shadow-card-hover"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <Icon />
              </div>
              <h3 className="mt-5 font-display text-xl font-bold">{title}</h3>
              <p className="mt-2 leading-relaxed text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------- Recent work */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand">Recent work</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-5xl">Sites we&apos;ve built for local businesses</h2>
            <p className="mt-4 text-lg text-slate-600">
              Real, branded websites built to convert — each one paired with the same lead dashboard.
            </p>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-2">
            {WORK.map((w) => (
              <figure
                key={w.name}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition hover:-translate-y-1 hover:shadow-card-hover"
              >
                {/* browser chrome */}
                <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="ml-3 text-xs font-medium text-slate-400">{w.name}</span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={w.src} alt={`${w.name} website built by Steel Scale`} className="w-full" loading="lazy" />
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- How it works */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand">How it works</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-5xl">Up and running in days, not months</h2>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n}>
                <div className="font-display text-5xl font-extrabold text-brand/25">{s.n}</div>
                <h3 className="mt-3 font-display text-xl font-bold">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-slate-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- CTA band */}
      <section className="bg-ink py-20 text-center text-white">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="font-display text-3xl font-extrabold sm:text-5xl">
            Ready to grow your business?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
            Already a client? Log in to manage your leads, pipeline, and website content.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className="rounded-xl bg-brand px-8 py-4 text-base font-bold uppercase tracking-wide text-white shadow-card-hover transition hover:-translate-y-0.5 hover:bg-brand-dark"
            >
              Client Login
            </Link>
            <a
              href="mailto:hello@steelscalesystems.com"
              className="rounded-xl border-2 border-white/30 px-8 py-4 text-base font-bold uppercase tracking-wide text-white transition hover:-translate-y-0.5 hover:bg-white/10"
            >
              Get in Touch
            </a>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Footer */}
      <footer className="bg-ink">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-white/10 px-6 py-8 text-sm text-white/50 sm:flex-row">
          <BrandLogo className="h-8 w-auto" />
          <p>© {new Date().getFullYear()} Steel Scale Systems. All rights reserved.</p>
          <Link href="/login" className="font-semibold text-white hover:text-brand">
            Client Login
          </Link>
        </div>
      </footer>
    </div>
  );
}

// Radial brand glow behind the hero headline.
const heroGlow: React.CSSProperties = {
  background:
    "radial-gradient(600px circle at 15% 0%, rgba(37,99,235,0.35), transparent 60%), radial-gradient(700px circle at 90% 100%, rgba(37,99,235,0.20), transparent 55%)",
};

function Stars5() {
  return (
    <span className="flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }).map((_, i) => (
        <StarIcon key={i} className="h-5 w-5" />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------- Icons
function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18" strokeLinecap="round" />
    </svg>
  );
}
function InboxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 12l3-7h12l3 7v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6z" strokeLinejoin="round" />
      <path d="M3 12h5l1.5 2.5h5L16 12h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" strokeLinejoin="round" />
      <path d="M10 20a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}
function BoardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16M15 4v16" />
    </svg>
  );
}
function NoteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 3h11l3 3v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" strokeLinejoin="round" />
      <path d="M8 9h8M8 13h8M8 17h5" strokeLinecap="round" />
    </svg>
  );
}
function StarIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2l2.9 6.3 6.9.7-5.1 4.7 1.4 6.8L12 17.8 5.9 20.5l1.4-6.8L2.2 9l6.9-.7L12 2z" />
    </svg>
  );
}
