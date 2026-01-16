import type { ReactNode } from "react";

type PageShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function PageShell({ title, description, children }: PageShellProps) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-10">
      <div className="flex min-h-[60vh] flex-col justify-start md:min-h-[calc(100vh-10rem)]">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-10 shadow-xl shadow-slate-200/80">
          <div className="mb-8 space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              TC Simple
            </p>
            <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
            {description ? (
              <p className="text-base text-slate-600">{description}</p>
            ) : null}
          </div>
          <div className="space-y-6">{children}</div>
        </div>
      </div>
    </section>
  );
}

