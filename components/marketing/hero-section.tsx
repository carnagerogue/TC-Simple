"use client";

import type React from "react";
import { useCallback } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { GlassCard } from "@/components/marketing/glass-card";
import { Logo } from "@/components/logo";

export function HeroSection() {
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);

  const rotateX = useSpring(useTransform(tiltY, [-0.5, 0.5], [8, -8]), { stiffness: 120, damping: 20 });
  const rotateY = useSpring(useTransform(tiltX, [-0.5, 0.5], [-8, 8]), { stiffness: 120, damping: 20 });
  const translateX = useSpring(useTransform(tiltX, [-0.5, 0.5], [-12, 12]));
  const translateY = useSpring(useTransform(tiltY, [-0.5, 0.5], [-6, 6]));

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    tiltX.set(x);
    tiltY.set(y);
  }, [tiltX, tiltY]);

  const handlePointerLeave = useCallback(() => {
    tiltX.set(0);
    tiltY.set(0);
  }, [tiltX, tiltY]);

  return (
    <section className="relative isolate overflow-hidden rounded-[48px] bg-gradient-to-b from-[#cfd8f1] via-[#121c2d] to-[#182a40] px-6 py-24 text-white shadow-[0_40px_120px_rgba(6,13,25,0.65)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_60%)]" />
      <div className="flex w-full flex-col gap-16 px-8 lg:flex-row lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="space-y-10"
        >
          <Logo className="drop-shadow-[0_10px_35px_rgba(79,128,255,0.4)]" />
          <div className="space-y-6">
            <p className="tracking-[0.35em] text-xs uppercase text-slate-200">Transaction coordination · Elevated</p>
            <h1 className="text-4xl font-medium leading-[1.1] text-slate-50 md:text-6xl">
              Real estate deals deserve a precise, effortless back office.
            </h1>
            <p className="max-w-2xl text-lg text-slate-200">
              TC Simple ingests contracts, breathes life into timelines, and guides every stakeholder through premium
              status updates—calm, immersive, unforgettable.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-100">
            {["Smart Intake", "Guided Timelines", "Immersive Updates"].map((item) => (
              <span key={item} className="rounded-full border border-white/20 bg-white/5 px-5 py-2">
                {item}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="relative w-full lg:max-w-2xl"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <motion.div
            style={{ rotateX, rotateY, translateX, translateY }}
            className="will-change-transform"
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <GlassCard className="h-[380px] w-full border-white/15 bg-white/10 p-8 text-left text-slate-50">
              <div className="space-y-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-200">Intake snapshot</p>
                  <p className="mt-2 text-2xl font-semibold text-white">Elm Street Collaboration</p>
                  <p className="text-sm text-slate-300">Inspection · Financing · Closing</p>
                </div>
                <div className="space-y-4">
                  {[
                    { label: "Inspection due", date: "Mar 12" },
                    { label: "Loan commitment", date: "Mar 20" },
                    { label: "Closing", date: "Mar 28" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-slate-200">
                      <span>{item.label}</span>
                      <span className="text-emerald-300">{item.date}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                  {["Buyer update sent", "Docs synced to Drive", "Slack reminder scheduled"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-slate-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </motion.div>
          <motion.div
            className="pointer-events-none absolute -right-12 -top-12 hidden h-24 w-24 rounded-full bg-emerald-400/40 blur-3xl lg:block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          />
          <motion.div
            className="pointer-events-none absolute -left-12 bottom-0 hidden h-24 w-24 rounded-full bg-sky-500/40 blur-3xl lg:block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          />
        </motion.div>
      </div>
    </section>
  );
}

