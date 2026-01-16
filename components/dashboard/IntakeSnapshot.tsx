"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Card } from "@/components/ui/card";

type Transaction = {
  id: string;
  name: string;
  stage: "Intake" | "Under Contract" | "Closing";
  deadlines: {
    label: string;
    date: string;
  }[];
  progress: number;
  agent: string;
  client: string;
};

type IntakeSnapshotProps = {
  transactions: Transaction[];
};

const stageColors: Record<Transaction["stage"], string> = {
  Intake: "text-sky-400",
  "Under Contract": "text-amber-400",
  Closing: "text-emerald-400",
};

export function IntakeSnapshot({ transactions }: IntakeSnapshotProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7 }}
      className="w-full"
    >
      <Card className="w-full bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white shadow-[0_35px_80px_rgba(2,6,24,0.45)]">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Intake Snapshot</p>
            <h3 className="text-2xl font-semibold">Live transactions</h3>
          </div>
          <span className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/70">
            {transactions.length} Active
          </span>
        </div>

        <div className="space-y-6">
          {transactions.map((txn) => (
            <Link key={txn.id} href={`/dashboard/transactions/${txn.id}`} className="block">
            <div
              className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-slate-900/40 transition hover:bg-white/10"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-lg font-semibold">{txn.name}</h4>
                  <p className={`text-xs uppercase tracking-[0.3em] ${stageColors[txn.stage]}`}>{txn.stage}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-white/70">
                  <span>{txn.agent}</span>
                  <span className="h-1 w-1 rounded-full bg-white/30" />
                  <span>{txn.client}</span>
                </div>
              </div>

              <div className="mt-4 h-2 w-full rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400"
                  style={{ width: `${txn.progress}%` }}
                />
              </div>

              <div className="mt-4 grid gap-3 text-sm text-white/80 md:grid-cols-3">
                {txn.deadlines.map((deadline) => (
                  <div
                    key={deadline.label}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-white/80"
                  >
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">{deadline.label}</p>
                    <p className="text-base font-semibold">{deadline.date}</p>
                  </div>
                ))}
              </div>
            </div>
            </Link>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

