"use client";

import { motion } from "framer-motion";

const scenes = [
  {
    title: "Capture",
    copy: "Upload, forward, or sync from your brokerage. TC Simple immediately frames every detail.",
  },
  {
    title: "Translate",
    copy: "Contracts become structured data. Deadlines breathe, sequences align, and cross-channel updates draft themselves.",
  },
  {
    title: "Deliver",
    copy: "Immersive storyboards showcase progress for clients, agents, and vendors—calm, transparent, premium.",
  },
];

export function CinematicScroller() {
  return (
    <section className="relative w-full space-y-16 overflow-hidden rounded-[48px] bg-gradient-to-b from-white via-slate-50 to-white px-8 py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(15,23,42,0.08),_transparent_60%)]" />
      <div className="relative text-center w-full">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Narrative flow</p>
        <h2 className="mt-4 text-4xl font-medium text-slate-900">Your workload, told like cinema.</h2>
      </div>
      <div className="relative flex w-full flex-col gap-12">
        {scenes.map((scene, index) => (
          <motion.div
            key={scene.title}
            initial={{ opacity: 0, y: 80 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: index * 0.15, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[32px] border border-slate-200/70 bg-white/90 p-10 shadow-[0_30px_70px_rgba(15,23,42,0.07)]"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Scene {index + 1}</p>
            <h3 className="mt-3 text-3xl font-semibold text-slate-900">{scene.title}</h3>
            <p className="mt-3 text-base text-slate-500">{scene.copy}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

