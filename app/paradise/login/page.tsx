// app/paradise/login/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CITY_CONFIG } from "@/lib/cityConfig";

type Status = "idle" | "sending" | "sent" | "error";

export default function ParadiseLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam =
    searchParams.get("redirect") || "/paradise/admin";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // If already logged in, bounce straight to redirect target
  useEffect(() => {
    let cancelled = false;

    async function checkExistingSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (user) {
        router.replace(redirectParam);
      }
    }

    checkExistingSession();

    return () => {
      cancelled = true;
    };
  }, [router, redirectParam]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    try {
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : "";

      const redirectTo = `${origin}/paradise/login`;

      const { error: authError } =
        await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectTo,
          },
        });

      if (authError) {
        console.error("signInWithOtp error:", authError);
        setError(authError.message);
        setStatus("error");
        return;
      }

      setStatus("sent");
    } catch (err: any) {
      console.error("Magic link error:", err);
      setError("Unexpected error sending magic link.");
      setStatus("error");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {CITY_CONFIG.displayName}
          </p>
          <h1 className="text-lg font-semibold text-slate-900">
            Admin sign-in
          </h1>
          <p className="text-sm text-slate-600">
            Enter your work email and we&apos;ll send you a secure
            one-time sign-in link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              placeholder="you@city.gov"
              autoComplete="email"
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {status === "sent" && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              Magic link sent. Check your email and open the link
              on this device.
            </div>
          )}

          <button
            type="submit"
            disabled={status === "sending"}
            className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "sending"
              ? "Sending link..."
              : "Send magic link"}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-500">
          Make sure your deployment&apos;s domain is added as an
          allowed redirect URL in Supabase Auth settings.
        </p>
      </div>
    </main>
  );
}
