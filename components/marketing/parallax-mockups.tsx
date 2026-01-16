"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { GlassCard } from "@/components/marketing/glass-card";

export function ParallaxMockups() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start center", "end start"],
  });

  const translateLeft = useTransform(scrollYProgress, [0, 1], [-40, 40]);
  const translateRight = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const opacity = useTransform(scrollYProgress, [0, 1], [0.5, 1]);

  return (
    <section ref={ref} className="relative overflow-hidden rounded-[48px] bg-[#050505] px-6 py-24 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(15,23,42,0.55),transparent_60%)]" />
      <div className="relative flex w-full flex-col gap-16 px-8 md:flex-row md:items-center">
        <motion.div style={{ opacity }} className="space-y-8 md:w-1/2">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-300">Clarity in every moment</p>
          <h2 className="text-4xl font-medium leading-tight text-white">
            Complicated transactions become clear, trackable, and simple.
          </h2>
          <p className="text-base text-slate-200">
            Every transaction showcases the journey—from inspection uploads to closing recaps. We spotlight the best
            part of TC Simple: transforming messy workflows into calm, confident storytelling for your clients.
          </p>
        </motion.div>
        <div className="relative h-[420px] md:w-1/2">
          <motion.div
            style={{ x: translateLeft }}
            className="absolute left-0 top-10 w-3/4"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 1 }}
          >
            <GlassCard className="border-white/10 bg-white/10 p-0">
              <Image
                src="/hero-preview.svg"
                alt="TC Simple mockup"
                width={900}
                height={600}
                className="h-full w-full rounded-[28px] object-cover"
                priority
              />
            </GlassCard>
          </motion.div>
          <motion.div
            style={{ x: translateRight }}
            className="absolute right-0 top-0 w-3/4"
            initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1.1, delay: 0.2 }}
          >
            <GlassCard className="border-white/10 bg-white/10 p-6 text-left text-slate-100">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-200">Realtime summary</p>
              <h3 className="mt-4 text-2xl font-semibold text-white">
                &ldquo;Loan docs cleared. Timeline recalibrated.&rdquo;
              </h3>
              <p className="mt-3 text-sm text-slate-200">
                Clients see the narrative update instantly, while your team receives structured tasks and annotated PDF
                callouts. It feels alive.
              </p>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

