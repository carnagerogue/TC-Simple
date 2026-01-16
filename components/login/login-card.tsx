"use client";

import { signIn } from "next-auth/react";

export function LoginCard() {
  return (
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-10 text-white shadow-2xl backdrop-blur-[32px] animate-fade-in">
      <div className="text-center mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome Back</h1>
        <p className="text-sm text-slate-300">Sign in to access your TC Simple dashboard.</p>
      </div>

      <button
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="w-full rounded-full bg-white py-3 text-slate-900 font-medium shadow-lg transition hover:bg-slate-200 flex items-center justify-center gap-3"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
          <path
            fill="#FFC107"
            d="M43.611 20.083H42V20H24v8h11.303C33.243 33.659 29.065 37 24 37c-7.18 0-13-5.82-13-13s5.82-13 13-13c3.31 0 6.31 1.235 8.585 3.26l5.657-5.657C34.204 5.097 29.355 3 24 3 12.954 3 4 11.954 4 23s8.954 20 20 20 20-8.954 20-20c0-1.341-.138-2.65-.389-3.917z"
          />
          <path
            fill="#FF3D00"
            d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.31 0 6.31 1.235 8.585 3.26l5.657-5.657C34.204 5.097 29.355 3 24 3 16.318 3 9.607 7.134 6.306 14.691z"
          />
          <path
            fill="#4CAF50"
            d="M24 43c5.005 0 9.514-1.938 12.918-5.083l-6.024-4.772C28.83 35.766 26.52 37 24 37c-5.04 0-9.24-3.442-10.603-8.086l-6.532 5.04C9.52 39.443 16.23 43 24 43z"
          />
          <path
            fill="#1976D2"
            d="M43.611 20.083H42V20H24v8h11.303c-.623 2.482-2.05 4.63-4.082 6.145l6.023 4.772C40.158 35.175 42.5 29.702 42.5 24c0-1.341-.138-2.65-.389-3.917z"
          />
        </svg>
        Continue with Google
      </button>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

