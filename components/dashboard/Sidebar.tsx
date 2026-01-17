"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Logo } from "@/components/logo";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Transactions", href: "/transactions" },
  { label: "Tasks", href: "/tasks" },
  { label: "Calendar", href: "/calendar" },
  { label: "Deadlines", href: "/dashboard" },
  { label: "Contacts", href: "/contacts" },
  { label: "Documents", href: "/documents" },
  { label: "Email Templates", href: "/email-templates" },
];

export function Sidebar() {
  const { data } = useSession();
  const userImage = typeof data?.user?.image === "string" && data.user.image.length > 0 ? data.user.image : null;
  const userInitials = data?.user?.name
    ?.split(" ")
    .map((token) => token[0])
    .slice(0, 2)
    .join("") ?? "TC";

  return (
    <motion.aside
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="flex h-full w-[260px] flex-col rounded-[32px] bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-slate-950/60 p-6 text-white shadow-[0_40px_80px_rgba(2,6,23,0.45)] backdrop-blur-2xl border border-[#9bc4ff33] shadow-[0_0_0_1px_rgba(155,196,255,0.2),0_40px_80px_rgba(2,6,23,0.45)]"
    >
      <div className="flex items-center justify-between">
        <Logo size="compact" className="w-40" />
      </div>

      <Link
        href="/upload"
        className="mt-8 block w-full rounded-2xl bg-white/20 py-3 text-center text-sm font-medium text-white shadow-inner transition hover:bg-white/30"
      >
        New Transaction
      </Link>

      <nav className="mt-10 flex flex-col gap-2 text-sm font-medium text-white/80">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="rounded-2xl px-4 py-2 transition hover:bg-white/10 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80 shadow-inner">
        {userImage ? (
          <div className="relative h-12 w-12 overflow-hidden rounded-full border border-white/15 bg-white/10">
            <Image
              src={userImage}
              alt={data?.user?.name ?? "Profile photo"}
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-lg font-semibold text-white">
            {userInitials}
          </div>
        )}
        <div>
          <p className="font-semibold text-white">{data?.user?.name ?? "Your profile"}</p>
          <p className="text-xs text-white/60">{data?.user?.email ?? "Coordinator"}</p>
        </div>
      </div>
    </motion.aside>
  );
}

