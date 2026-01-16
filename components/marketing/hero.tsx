import Link from "next/link";
import { ArrowRightIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { Logo } from "@/components/logo";

type HeroProps = {
  isAuthenticated: boolean;
};

export function Hero({ isAuthenticated }: HeroProps) {
  const primaryCta = isAuthenticated
    ? { label: "Open your dashboard", href: "/dashboard" }
    : { label: "Get started", href: "/login" };

  const secondaryCta = isAuthenticated
    ? { label: "Upload a PDF", href: "/upload" }
    : { label: "See product tour", href: "#features" };

  const highlights = ["Smart intake", "Auto timelines", "Integrated comms"];

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/70 bg-gradient-to-br from-white via-[#F8FAFF] to-white px-10 py-24 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
      <div className="absolute inset-y-0 left-0 right-0 m-auto h-[420px] w-[420px] rounded-full bg-gradient-to-b from-[#E0E9FF] to-transparent opacity-60 blur-[120px]" />
      <div className="relative grid gap-12 lg:grid-cols-2">
        <div className="space-y-6">
          <Logo showTagline />
          <p className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/60 px-4 py-1 text-xs font-semibold tracking-[0.2em] text-slate-500">
            Transaction coordination · Elevated
          </p>
          <h1 className="text-[34px] font-semibold leading-snug text-slate-900 md:text-[48px] md:leading-[1.15]">
            Give every real estate deal a calm, automated back office.
          </h1>
          <p className="max-w-2xl text-base text-slate-600 md:text-lg">
            TC Simple ingests contracts, tracks contingencies, and notifies the right people at the
            right time—no more fragile spreadsheets or frantic email chains.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href={primaryCta.href}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#111827] px-6 py-3 text-base font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-black"
            >
              {primaryCta.label}
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <Link
              href={secondaryCta.href}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 px-6 py-3 text-base font-semibold text-slate-800 transition hover:border-slate-300"
            >
              {secondaryCta.label}
            </Link>
          </div>
          <ul className="flex flex-wrap gap-4 text-sm text-slate-500">
            {highlights.map((item) => (
              <li key={item} className="inline-flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-[#3A5AFE]" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.1)] backdrop-blur">
            <div className="space-y-5 text-sm">
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Intake snapshot
                </p>
                <p className="mt-2 text-base font-semibold text-slate-900">Elm Street purchase</p>
                <p className="text-slate-500">Inspection • Financing • Closing</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Timeline highlights
                </p>
                <ul className="mt-3 space-y-2 text-slate-600">
                  <li className="flex items-center justify-between">
                    <span>Inspection due</span>
                    <span className="font-semibold text-emerald-600">Mar 12</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Loan commitment</span>
                    <span className="font-semibold text-emerald-600">Mar 20</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Closing</span>
                    <span className="font-semibold text-emerald-600">Mar 28</span>
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Communications
                </p>
                <div className="mt-3 space-y-2 text-slate-600">
                  <p>✅ Buyer update sent via Gmail</p>
                  <p>✅ Docs synced to Drive</p>
                  <p>⏳ Slack reminder scheduled</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

