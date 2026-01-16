"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Logo } from "@/components/logo";
import { LogoutButton } from "@/components/logout-button";

const marketingLinks = [
  { label: "Features", href: "#features" },
  { label: "Workflow", href: "#workflow" },
  { label: "Stories", href: "#stories" },
];

type SiteHeaderClientProps = {
  isAuthenticated: boolean;
};

export function SiteHeaderClient({ isAuthenticated }: SiteHeaderClientProps) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 60);
  });

  return (
    <motion.header initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-x-0 top-0 z-50 px-6">
      <div
        className={`flex w-full items-center justify-between rounded-full px-8 py-4 transition-all ${
          scrolled
            ? "bg-white/80 shadow-[0_25px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl"
            : "bg-white/20 backdrop-blur"
        }`}
        style={{
          border: ".5px solid rgba(155, 196, 255, 0.6)",
          boxShadow:
            "0 0 20px 2px rgba(155,196,255,0.12), 0 0 18px 4px cdrgba(131, 183, 254, 0.16), 0 25px 60px rgba(10, 24, 55, 0.06)",
        }}
      >
        <Link href="/" className="flex items-center">
          <Logo size="compact" />
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          {marketingLinks.map((link) => (
            <a key={link.href} href={link.href} className="transition hover:text-slate-900">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-800 transition hover:border-slate-300"
              >
                Dashboard
              </Link>
              <LogoutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </motion.header>
  );
}

