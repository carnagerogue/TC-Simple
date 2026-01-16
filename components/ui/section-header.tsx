"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function SectionHeader({ title, subtitle, actions, className }: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn("flex flex-wrap items-end justify-between gap-4", className)}
    >
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{subtitle}</p>
        <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </motion.div>
  );
}

