"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/marketing/glass-card";

const steps = [
  {
    title: "Import",
    body: "Raise an email, drag a PDF, or sync from your MLS. TC Simple captures context instantly.",
  },
  {
    title: "Interpret",
    body: "Clauses are decoded, names resolved, tasks sequenced. You edit like a creative director.",
  },
  {
    title: "Orchestrate",
    body: "Timelines, reminders, and deliverables move in one elegant stream—Slack, email, calendar.",
  },
  {
    title: "Deliver",
    body: "Clients receive cinematic recaps and shareable boards. Every touchpoint feels intentional.",
  },
];

export function HowItWorks() {
  return (
    <section className="space-y-12 px-8 w-full">
      <div className="text-center w-full">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">How it works</p>
        <h2 className="mt-4 text-4xl font-medium text-slate-900">From PDF chaos to gallery-worthy deliverables.</h2>
      </div>
      <div className="grid w-full gap-6 md:grid-cols-2">
        {steps.map((step, index) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.8, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <GlassCard className="group h-full border-slate-200/60 bg-white/85 p-8 text-left text-slate-900 shadow-[0_30px_60px_rgba(15,23,42,0.07)]">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Step {index + 1}</div>
              <h3 className="mt-4 text-2xl font-semibold">{step.title}</h3>
              <p className="mt-3 text-sm text-slate-600">{step.body}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

