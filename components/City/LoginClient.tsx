// components/City/LoginClient.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CITY_CONFIG } from "@/lib/cityConfig";
import { cityHref } from "@/lib/cityRouting";

type Status = "idle" | "sending" | "sent" | "error";

type Props = {
  redirect: string;
};

export default function LoginClient({ redirect }: Props) {
  const router = useRouter();

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

      if (!cancelled && user) {
        router.replace(redirect || cityHref("/"));
      }
    }

    checkExistingSession();

    return () => {
      cancelled = true;
    };
  }, [router, redirect]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    try {
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : "";

      const redirectTo = `${origin}${cityHref("/login")}`;

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
    <div
      className="flex min-h-screen items-center justify-center bg-slate-50 px-4"
      role="region"
      aria-label="Admin login"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Admin access
          </p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
            {CITY_CONFIG.displayName} admin portal
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Enter your work email and we&apos;ll send you a secure
            sign-in link.
          </p>
        </div>

        {error && (
          <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}

        {status === "sent" ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            Check your email for a sign-in link.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-3"
            aria-describedby="login-help-text"
          >
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-xs font-medium text-slate-700"
              >
                Work email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1"
              />
            </div>

            <button
              type="submit"
              disabled={status === "sending"}
              className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-slate-50 shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {status === "sending"
                ? "Sending link..."
                : "Send magic link"}
            </button>
          </form>
        )}

        <p
          id="login-help-text"
          className="mt-4 text-xs text-slate-500"
        >
          Make sure your deployment&apos;s domain is added as an
          allowed redirect URL in Supabase Auth settings.
        </p>
      </div>
    </div>
  );
}
