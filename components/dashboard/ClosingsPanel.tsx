"use client";

import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { motion } from "framer-motion";

type Closing = {
  id: string;
  property: string;
  date: string;
  progress: number;
};

type ClosingsPanelProps = {
  closings: Closing[];
};

export function ClosingsPanel({ closings }: ClosingsPanelProps) {
  return (
    <Card className="h-full w-full bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-[0_30px_70px_rgba(2,6,23,0.45)]">
      <SectionHeader title="Upcoming Closings" subtitle="final mile" />
      <div className="mt-6 space-y-5">
        {closings.map((closing) => (
          <motion.div
            key={closing.id}
            whileHover={{ translateY: -3 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">{closing.property}</p>
                <p className="text-sm text-white/70">{closing.date}</p>
              </div>
              <span className="text-sm font-semibold text-emerald-300">{closing.progress}%</span>
            </div>
            <div className="mt-4 h-2 w-full rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400"
                style={{ width: `${closing.progress}%` }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

