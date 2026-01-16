"use client";

import { useMemo } from "react";

interface ParsedItemsListProps {
  parsed: Record<string, unknown> | null;
  selected: string[];
  setSelected: (keys: string[]) => void;
}

const labelMap: Record<string, string> = {
  buyer_name: "Buyer Name",
  seller_name: "Seller Name",
  property_address: "Property Address",
  property_city: "Property City",
  property_state: "Property State",
  property_zip: "Property Zip",
  purchase_price: "Purchase Price",
  earnest_money_amount: "Earnest Money Amount",
  earnest_money_delivery_date: "Earnest Money Due Date",
  contract_date: "Contract Date",
  effective_date: "Effective Date",
  closing_date: "Closing Date",
  possession_date: "Possession Date",
  title_insurance_company: "Title Insurance Company",
  closing_agent_company: "Closing Agent Company",
  closing_agent_name: "Closing Agent Name",
  information_verification_period: "Information Verification Period",
  included_items: "Included Items",
  buyer_signed_date: "Buyer Signed Date",
  seller_signed_date: "Seller Signed Date",
};

type CardItem = {
  key: string;
  label: string;
  value: string | string[];
};

function toCards(parsed: Record<string, unknown> | null): CardItem[] {
  if (!parsed) return [];
  const cards: CardItem[] = [];
  Object.entries(parsed).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "" || key === "tasks") return;
    const label = labelMap[key] || key.replace(/_/g, " ");
    if (Array.isArray(value)) {
      if (!value.length) return;
      cards.push({ key, label, value });
    } else {
      const str = String(value).trim();
      if (!str) return;
      cards.push({ key, label, value: str });
    }
  });
  return cards;
}

export function ParsedItemsList({ parsed, selected, setSelected }: ParsedItemsListProps) {
  const cards = useMemo(() => toCards(parsed), [parsed]);

  const toggle = (key: string) => {
    if (selected.includes(key)) {
      setSelected(selected.filter((k) => k !== key));
    } else {
      setSelected([...selected, key]);
    }
  };

  return (
    <div className="bg-white border border-[#9bc4ff] rounded-xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold text-gray-800">Parsed Items</p>
          <p className="text-xs text-gray-500">Toggle which parsed items to convert into tasks.</p>
        </div>
        <span className="rounded-full bg-[#e5f0ff] px-3 py-1 text-[11px] font-semibold text-[#377ddf]">
          {selected.length} selected
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {cards.map((card) => (
          <div
            key={card.key}
            onClick={() => toggle(card.key)}
            className={`flex cursor-pointer items-start gap-4 py-3 border-b last:border-b-0 border-gray-200 hover:bg-[#e9f2ff] rounded-lg transition bg-white border border-[#9bc4ff] px-4 ${
              selected.includes(card.key) ? "shadow-md" : ""
            }`}
          >
            <input
              type="checkbox"
              readOnly
              checked={selected.includes(card.key)}
              className="h-5 w-5 rounded border-[#9bc4ff] text-[#9bc4ff] focus:ring-[#9bc4ff] mt-1"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">{card.label}</p>
              {Array.isArray(card.value) ? (
                <ul className="mt-1 list-disc pl-5 text-sm text-gray-600">
                  {card.value.map((v) => (
                    <li key={v}>{v}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-600 mt-1">{card.value}</p>
              )}
            </div>
          </div>
        ))}
        {cards.length === 0 ? <p className="text-xs text-gray-500">No parsed items found.</p> : null}
      </div>
    </div>
  );
}
