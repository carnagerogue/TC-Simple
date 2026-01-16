"use client";

type ParsedItemCardProps = {
  field: string;
  label: string;
  value: string | string[];
  selected: boolean;
  onToggle: () => void;
};

export function ParsedItemCard({ label, value, selected, onToggle }: ParsedItemCardProps) {
  const renderValue = () => {
    if (Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-2">
          {value.map((v) => (
            <span
              key={v}
              className="rounded-full bg-[#eaf2ff] px-3 py-1 text-xs font-medium text-[#1b4c96]"
            >
              {v}
            </span>
          ))}
        </div>
      );
    }
    return <div className="text-sm text-gray-600">{value}</div>;
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
        selected
          ? "border-[#9bc4ff] bg-[#eaf2ff]"
          : "border-gray-200 bg-white hover:border-[#9bc4ff] hover:bg-[#f5f8ff]"
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        readOnly
        className="mt-1 h-4 w-4 rounded border-[#9bc4ff] text-[#9bc4ff] focus:ring-[#9bc4ff]"
      />
      <div className="flex-1 space-y-1">
        <div className="text-sm font-medium text-gray-900">{label}</div>
        {renderValue()}
      </div>
    </button>
  );
}

