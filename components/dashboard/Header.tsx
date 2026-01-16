"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";

export function Header() {
  const { data } = useSession();
  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(new Date()),
    [],
  );

  return (
    <motion.header
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex flex-wrap items-center justify-between gap-6 rounded-3xl bg-white/60 px-8 py-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl"
    >
      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Dashboard</p>
        <h1 className="text-4xl font-semibold text-slate-900">
          Good morning, {data?.user?.name ?? "Coordinator"}
        </h1>
        <p className="text-sm text-slate-500">{today}</p>
      </div>
      <Link
        href="/upload"
        className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800"
      >
        Start new document
      </Link>
    </motion.header>
  );
}

