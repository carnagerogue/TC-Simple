type FeatureBandProps = {
  title: string;
  subtitle: string;
  bullets: string[];
  imageOnLeft?: boolean;
};

export function FeatureBand({ title, subtitle, bullets, imageOnLeft }: FeatureBandProps) {
  const image = (
    <div className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white via-[#F6F8FF] to-white p-8 shadow-[0_25px_60px_rgba(15,23,42,0.07)]">
      <div className="space-y-4 text-sm text-slate-600">
        <div className="rounded-2xl border border-white/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workflow</p>
          <p className="mt-2 text-base font-semibold text-slate-900">{title}</p>
          <p>{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-white/80 bg-white p-4 shadow-sm">
          <ul className="space-y-3">
            {bullets.slice(0, 3).map((bullet) => (
              <li key={bullet} className="flex items-center justify-between">
                <span className="text-slate-700">{bullet}</span>
                <span className="text-xs font-semibold text-[#10B981]">Live</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  const copy = (
    <div className="space-y-5">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <h3 className="text-3xl font-semibold text-slate-900">{subtitle}</h3>
      <ul className="space-y-3 text-sm text-slate-600">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-3">
            <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-[#111827]" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <section className="grid gap-12 rounded-[32px] border border-slate-200 bg-white px-10 py-14 shadow-[0_25px_80px_rgba(15,23,42,0.06)] lg:grid-cols-2">
      {imageOnLeft ? (
        <>
          {image}
          {copy}
        </>
      ) : (
        <>
          {copy}
          {image}
        </>
      )}
    </section>
  );
}

