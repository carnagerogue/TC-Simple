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
  parsed: unknown; // expects { extracted: {...}, tasks: [...] }
  onCreate: (tasks: SuggestedTask[]) => Promise<void> | void;
};

type ParsedTaskLike = string | { title?: unknown };
type ParsedPayload = { extracted?: unknown; tasks?: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildSuggestedTasks(parsed: unknown): SuggestedTask[] {
  const tasks: SuggestedTask[] = [];
  const payload: ParsedPayload = isRecord(parsed) ? (parsed as ParsedPayload) : {};
  const extractedRaw = payload.extracted ?? parsed;
  const extracted = isRecord(extractedRaw) ? extractedRaw : {};
  const addTask = (title: string, meta?: string) => {
    if (!title) return;
    tasks.push({ id: nanoid(), title, meta, checked: true });
  };

  const buyerName = typeof extracted.buyer_name === "string" ? extracted.buyer_name : "";
  const sellerName = typeof extracted.seller_name === "string" ? extracted.seller_name : "";
  const propertyAddress = typeof extracted.property_address === "string" ? extracted.property_address : "";
  const contractDate = typeof extracted.contract_date === "string" ? extracted.contract_date : "";
  const closingDate = typeof extracted.closing_date === "string" ? extracted.closing_date : "";
  const purchasePrice = typeof extracted.purchase_price === "string" ? extracted.purchase_price : "";
  const earnestMoney = typeof extracted.earnest_money_amount === "string" ? extracted.earnest_money_amount : "";
  const earnestDelivery = typeof extracted.earnest_money_delivery_date === "string" ? extracted.earnest_money_delivery_date : undefined;
  const includedItems = Array.isArray(extracted.included_items) ? extracted.included_items : [];

  if (buyerName) addTask(`Record buyer contact: ${buyerName}`);
  if (sellerName) addTask(`Record seller contact: ${sellerName}`);
  if (propertyAddress)
    addTask(`Confirm property address: ${propertyAddress}`, [
      typeof extracted.property_city === "string" ? extracted.property_city : "",
      typeof extracted.property_state === "string" ? extracted.property_state : "",
      typeof extracted.property_zip === "string" ? extracted.property_zip : "",
    ]
      .filter(Boolean)
      .join(", "));
  if (contractDate) addTask(`Record contract date: ${contractDate}`);
  if (closingDate) addTask(`Schedule closing follow-up: ${closingDate}`);
  if (purchasePrice) addTask(`Confirm purchase price: ${purchasePrice}`);
  if (earnestMoney) addTask(`Track earnest money: ${earnestMoney}`, earnestDelivery);
  if (includedItems.length) {
    includedItems.forEach((item) => {
      if (typeof item === "string" && item.trim()) addTask(`Confirm included item: ${item}`);
    });
  }
  // include model-provided tasks if present
  if (Array.isArray(payload.tasks)) {
    (payload.tasks as ParsedTaskLike[]).forEach((t) => {
      if (typeof t === "string") addTask(t);
      if (t && typeof t === "object" && typeof t.title === "string") addTask(t.title);
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

