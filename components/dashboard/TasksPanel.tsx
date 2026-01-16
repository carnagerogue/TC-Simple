"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";

type Task = {
  id: string;
  title: string;
  property: string;
  due: string;
  status: "upcoming" | "overdue";
};

type TasksPanelProps = {
  tasks: Task[];
};

export function TasksPanel({ tasks }: TasksPanelProps) {
  const [filter, setFilter] = useState<"upcoming" | "overdue">("upcoming");
  const filtered = tasks.filter((task) => task.status === filter);

  return (
    <Card className="h-full w-full bg-white text-slate-900 p-6 shadow-[0_30px_60px_rgba(15,23,42,0.08)]">
      <SectionHeader
        title="My Tasks"
        subtitle="keep moving"
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
        {filtered.map((task) => (
          <motion.div
            key={task.id}
            whileHover={{ translateY: -2 }}
            className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-inner transition"
          >
            <p className="text-base font-semibold">{task.title}</p>
            <p className="text-sm text-slate-500">{task.property}</p>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Due {task.due}</p>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

