"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/marketing/glass-card";

const features = [
  {
    title: "Smart intake",
    lines: ["Drop PDFs or portals", "We extract people + contingencies", "Glass-panel QA before handoff"],
  },
  {
    title: "Timeline engine",
    lines: ["Apple Calendar-grade reminders", "Cross-channel nudges", "Slack + Gmail perfectly synced"],
  },
  {
    title: "Guided comms",
    lines: ["Luxury-grade update emails", "Meeting recaps auto generated", "Downloadable storyboards"],
  },
  {
    title: "Coordinator cockpit",
    lines: ["Deal health board", "Blocks bubble to the top", "One tap to reshare deliverables"],
  },
];

export function FeatureShowcase() {
  return (
    <section className="space-y-10 px-8 w-full">
      <div className="text-center w-full">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Precision built</p>
        <h2 className="mt-4 text-4xl font-medium text-slate-900">A suite that feels custom crafted.</h2>
        <p className="mt-3 text-base text-slate-600">
          Minimal words, maximum clarity. Every panel glides upward as you arrive—designed for people who obsess over
          the details.
        </p>
      </div>
      <div className="grid w-full gap-6 md:grid-cols-2">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: index * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ rotateX: -3, rotateY: 3, translateY: -6 }}
            className="[perspective:1200px]"
          >
            <GlassCard className="h-full border-slate-200/70 bg-white/95 p-8 text-left text-slate-900 shadow-[0_30px_60px_rgba(15,23,42,0.08)]">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Module {index + 1}</p>
                <h3 className="text-2xl font-semibold text-slate-900">{feature.title}</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  {feature.lines.map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-900/70" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

