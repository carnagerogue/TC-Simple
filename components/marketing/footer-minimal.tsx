import Link from "next/link";
import { Logo } from "@/components/logo";

export function FooterMinimal() {
  return (
    <footer className="mt-24 border-t border-white/10 bg-black px-6 py-16 text-white">
      <div className="flex w-full flex-col gap-10 px-8 md:flex-row md:items-center md:justify-between">
        <div className="space-y-4">
          <Logo size="compact" />
          <p className="text-sm text-slate-400">
            TC Simple is the cinematic operating system for transaction coordinators.
          </p>
        </div>
        <div className="flex gap-10 text-sm text-slate-300">
          <div className="space-y-2">
            <p className="uppercase tracking-[0.3em] text-xs text-slate-500">Product</p>
            <Link href="#features" className="block hover:text-white">
              Features
            </Link>
            <Link href="#workflow" className="block hover:text-white">
              Workflow
            </Link>
            <Link href="#stories" className="block hover:text-white">
              Stories
            </Link>
          </div>
          <div className="space-y-2">
            <p className="uppercase tracking-[0.3em] text-xs text-slate-500">Company</p>
            <Link href="/login" className="block hover:text-white">
              Login
            </Link>
            <Link href="mailto:hello@tcsimple.com" className="block hover:text-white">
              Contact
            </Link>
          </div>
        </div>
      </div>
      <div className="mt-10 px-8 text-xs uppercase tracking-[0.35em] text-slate-600">
        Calm closings. Elevated service.
      </div>
    </footer>
  );
}

