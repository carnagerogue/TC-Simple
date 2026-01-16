"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export function LogoutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsSigningOut(true);
      await signOut({ callbackUrl: "/login" });
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isSigningOut}
      className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isSigningOut ? "Signing out…" : "Logout"}
    </button>
  );
}

