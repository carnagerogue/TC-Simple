"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";

type Deadline = {
  id: string;
  milestone: string;
  property: string;
  date: string;
  status: "upcoming" | "overdue";
};

type DeadlinesPanelProps = {
  deadlines: Deadline[];
};

export function DeadlinesPanel({ deadlines }: DeadlinesPanelProps) {
  const [filter, setFilter] = useState<"upcoming" | "overdue">("upcoming");
  const filtered = deadlines.filter((deadline) => deadline.status === filter);

  return (
    <Card className="h-full w-full bg-white text-slate-900 p-6 shadow-[0_30px_60px_rgba(15,23,42,0.08)]">
      <SectionHeader
        title="My Deadlines"
        subtitle="stay ahead"
        actions={
          <div className="rounded-full bg-slate-100 p-1 text-xs font-medium text-slate-500">
            {(["upcoming", "overdue"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`rounded-full px-3 py-1 transition ${
                  filter === tab ? "bg-white shadow text-slate-900" : ""
                }`}
              >
                {tab === "upcoming" ? "Upcoming" : "Overdue"}
              </button>
            ))}
          </div>
        }
      />

      <div className="mt-6 space-y-4">
        {filtered.map((deadline) => (
          <motion.div
            key={deadline.id}
            whileHover={{ translateY: -2 }}
            className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-inner transition"
          >
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold">{deadline.milestone}</p>
              <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-medium">
                {deadline.date}
              </span>
            </div>
            <p className="text-sm text-slate-500">{deadline.property}</p>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

