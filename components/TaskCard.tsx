"use client";

type TaskCardProps = {
  id: string;
  title: string;
  meta?: string;
  checked: boolean;
  onToggle: (id: string) => void;
};

export function TaskCard({ id, title, meta, checked, onToggle }: TaskCardProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      className={`group flex w-full items-start justify-between rounded-[12px] border border-slate-200 px-4 py-3 text-left transition hover:shadow-md ${
        checked ? "bg-[#f0f5ff] border-[#9bc4ff]" : "bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          readOnly
          className="mt-1 h-4 w-4 rounded border-slate-300 text-[#9bc4ff] focus:ring-[#9bc4ff]"
        />
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          {meta ? <p className="text-xs text-slate-500">{meta}</p> : null}
        </div>
      </div>
    </button>
  );
}

