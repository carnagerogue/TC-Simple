"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function LoginButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setError(null);
      setIsLoading(true);
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "We could not start Google sign-in.";
      setError(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleLogin}
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? "Redirecting to Google…" : "Login with Google"}
      </button>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

