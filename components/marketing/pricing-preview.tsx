"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/marketing/glass-card";

const plans = [
  {
    name: "Studio",
    price: "$49",
    cadence: "per coordinator / month",
    notes: ["Unlimited intakes", "Google + Slack + Drive", "Immersive updates"],
  },
  {
    name: "Ensemble",
    price: "Custom",
    cadence: "for teams scaling past 500 files",
    notes: ["Private onboarding", "Dedicated success partner", "Priority feature drops"],
    highlight: true,
  },
];

export function PricingPreview() {
  return (
    <section className="space-y-10 px-8 w-full">
      <div className="text-center w-full">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Preview pricing</p>
        <h2 className="mt-4 text-4xl font-medium text-slate-900">Luxury coordination without enterprise lock-in.</h2>
      </div>
      <div className="grid w-full gap-6 md:grid-cols-2">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 70 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.9, delay: index * 0.2 }}
          >
            <GlassCard
              className={`h-full border-slate-200/70 bg-white/80 p-8 text-left text-slate-900 ${
                plan.highlight ? "shadow-[0_45px_120px_rgba(79,128,255,0.25)]" : ""
              }`}
            >
              <div className="text-xs uppercase tracking-[0.4em] text-slate-500">{plan.name}</div>
              <p className="mt-6 text-5xl font-semibold">{plan.price}</p>
              <p className="text-sm text-slate-500">{plan.cadence}</p>
              <div className="mt-6 space-y-2 text-sm text-slate-600">
                {plan.notes.map((note) => (
                  <div key={note} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-900/70" />
                    {note}
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

