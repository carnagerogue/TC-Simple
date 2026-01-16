type TestimonialCardProps = {
  quote: string;
  author: string;
  role: string;
};

export function TestimonialCard({ quote, author, role }: TestimonialCardProps) {
  const initials = author
    .split(" ")
    .map((name) => name[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="rounded-[28px] border border-slate-200/70 bg-white/90 p-6 shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
      <p className="text-base text-slate-700">“{quote}”</p>
      <div className="mt-6 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/5 text-base font-semibold text-slate-900">
          {initials}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{author}</p>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{role}</p>
        </div>
      </div>
    </div>
  );
}

