import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

type CTASectionProps = {
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

export function CTASection({
  title,
  description,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: CTASectionProps) {
  return (
    <section className="rounded-[32px] border border-slate-900/80 bg-[#0C1222] px-10 py-16 text-white shadow-[0_35px_80px_rgba(15,23,42,0.5)]">
      <div className="space-y-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
          Ready to simplify?
        </p>
        <h2 className="text-3xl font-semibold">{title}</h2>
        <p className="text-base text-slate-300">{description}</p>
      </div>
      <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link
          href={primaryHref}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-3 text-base font-semibold text-slate-900 transition hover:bg-slate-100"
        >
          {primaryLabel}
          <ArrowRightIcon className="h-5 w-5" />
        </Link>
        {secondaryLabel && secondaryHref ? (
          <Link
            href={secondaryHref}
            className="inline-flex items-center justify-center rounded-2xl border border-white/40 px-8 py-3 text-base font-semibold text-white transition hover:bg-white/10"
          >
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

