"use client";

import { useEffect, useMemo, useState } from "react";
import { TaskCard } from "@/components/TaskCard";
import { nanoid } from "nanoid";

export type SuggestedTask = {
  id: string;
  title: string;
  meta?: string;
  checked: boolean;
};

type Props = {
  parsed: any; // expects { extracted: {...}, tasks: [...] }
  onCreate: (tasks: SuggestedTask[]) => Promise<void> | void;
};

function buildSuggestedTasks(parsed: any): SuggestedTask[] {
  const tasks: SuggestedTask[] = [];
  const extracted = parsed?.extracted ?? parsed ?? {};
  const addTask = (title: string, meta?: string) => {
    if (!title) return;
    tasks.push({ id: nanoid(), title, meta, checked: true });
  };

  if (extracted.buyer_name) addTask(`Record buyer contact: ${extracted.buyer_name}`);
  if (extracted.seller_name) addTask(`Record seller contact: ${extracted.seller_name}`);
  if (extracted.property_address)
    addTask(`Confirm property address: ${extracted.property_address}`, [
      extracted.property_city,
      extracted.property_state,
      extracted.property_zip,
    ]
      .filter(Boolean)
      .join(", "));
  if (extracted.contract_date) addTask(`Record contract date: ${extracted.contract_date}`);
  if (extracted.closing_date) addTask(`Schedule closing follow-up: ${extracted.closing_date}`);
  if (extracted.purchase_price)
    addTask(`Confirm purchase price: ${extracted.purchase_price}`);
  if (extracted.earnest_money_amount)
    addTask(
      `Track earnest money: ${extracted.earnest_money_amount}`,
      extracted.earnest_money_delivery_date || undefined,
    );
  if (Array.isArray(extracted.included_items)) {
    extracted.included_items.forEach((item: string) => {
      addTask(`Confirm included item: ${item}`);
    });
  }
  // include model-provided tasks if present
  if (Array.isArray(parsed?.tasks)) {
    parsed.tasks.forEach((t: any) => {
      if (typeof t === "string") addTask(t);
      if (t && typeof t === "object" && "title" in t && typeof t.title === "string")
        addTask(t.title);
    });
  }
  return tasks;
}

export function ParsedItems({ parsed, onCreate }: Props) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const suggestions = useMemo(() => buildSuggestedTasks(parsed), [parsed]);

  useEffect(() => {
    const next: Record<string, boolean> = {};
    suggestions.forEach((t) => (next[t.id] = true));
    setSelected(next);
  }, [suggestions]);

  const toggle = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedTasks = suggestions.filter((t) => selected[t.id]);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-semibold text-slate-800">Parsed Items</p>
          <p className="text-xs text-slate-500">
            Select the suggested tasks to add to your workflow.
          </p>
        </div>
        <span className="rounded-full bg-[#e5f0ff] px-3 py-1 text-[11px] font-semibold text-[#377ddf]">
          {selectedTasks.length} selected
        </span>
      </div>

      <div className="space-y-2">
        {suggestions.map((task) => (
          <TaskCard
            key={task.id}
            id={task.id}
            title={task.title}
            meta={task.meta}
            checked={!!selected[task.id]}
            onToggle={toggle}
          />
        ))}
        {suggestions.length === 0 ? (
          <p className="text-xs text-slate-500">No parsed items found.</p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onCreate(selectedTasks)}
          disabled={selectedTasks.length === 0}
          className="rounded-lg bg-[#9bc4ff] px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-[#80b4ff] disabled:opacity-60"
        >
          Create Tasks from Selected Items
        </button>
      </div>
    </div>
  );
}

