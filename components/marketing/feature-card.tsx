import type { ElementType } from "react";

type FeatureCardProps = {
  title: string;
  description: string;
  points: string[];
  Icon: ElementType;
};

export function FeatureCard({ title, description, points, Icon }: FeatureCardProps) {
  return (
    <div className="group h-full rounded-[28px] border border-slate-200/70 bg-white/90 p-7 shadow-[0_20px_45px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:border-slate-300">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/5 text-slate-900">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-6 text-2xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 text-sm text-slate-600">{description}</p>
      <ul className="mt-5 space-y-2 text-sm text-slate-600">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-3">
            <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-[#3A5AFE]" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

