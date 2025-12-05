// components/City/LoginClient.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CITY_CONFIG } from "@/lib/cityConfig";

type Status = "idle" | "sending" | "sent" | "error";

type Props = {
  /**
   * Path to send the user to once they're authenticated.
   * Example: "/paradise/admin" or "/paradise/admin/users"
   */
  redirect: string;
};

export default function LoginClient({ redirect }: Props) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // If already logged in, skip the login screen entirely.
  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (userError) {
          console.error("LoginClient: getUser error", userError);
          return;
        }

        if (user) {
          router.replace(redirect);
        }
      } catch (err) {
        console.error("LoginClient: unexpected getUser error", err);
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, [redirect, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const trimmed = email.trim();

    if (!trimmed) {
      setStatus("error");
      setError("Enter a valid work email address.");
      return;
    }

    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";

      if (!origin) {
        setStatus("error");
        setError("Unable to determine site URL. Try again in a moment.");
        return;
      }

      // Send user directly to the target page after magic-link auth
      // Example: https://your-site.com/paradise/admin
      const emailRedirectTo = `${origin}${redirect}`;

      const { error: authError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo,
        },
      });

      if (authError) {
        console.error("LoginClient: signInWithOtp error", authError);
        setStatus("error");
        setError(
          authError.message ||
            "We couldn’t send the sign-in link. Double-check the email and try again."
        );
        return;
      }

      setStatus("sent");
    } catch (err: any) {
      console.error("LoginClient: unexpected error", err);
      setStatus("error");
      setError(
        err?.message ??
          "Unexpected error while sending the sign-in link. Please try again."
      );
    }
  }

  const isSending = status === "sending";
  const isSent = status === "sent";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {CITY_CONFIG.displayName}
          </p>
          <h1 className="mt-1 text-lg font-semibold text-slate-900">
            Sign in to admin
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Use your work email to receive a secure one-time sign-in link.
          </p>
        </header>

        {isSent ? (
          <div
            aria-live="polite"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800"
          >
            <p className="font-semibold">Check your email</p>
            <p className="mt-1">
              We sent a sign-in link to{" "}
              <span className="font-medium">{email}</span>. Open this device’s
              email app and click the link to finish signing in.
            </p>
            <p className="mt-2 text-[0.75rem] text-emerald-900/80">
              If you don&apos;t see it, check your spam or junk folder. You can
              close this window; the link will take you directly to the admin
              portal.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
            aria-describedby="login-help-text"
          >
            <div className="space-y-1">
              <label
                htmlFor="login-email"
                className="text-xs font-medium text-slate-800"
              >
                Work email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSending}
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                placeholder="you@city.gov"
              />
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="flex h-10 w-full items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              {isSending ? "Sending secure link…" : "Send sign-in link"}
            </button>

            {status === "error" && error && (
              <p
                role="alert"
                className="text-xs text-red-600"
              >
                {error}
              </p>
            )}
          </form>
        )}

        <p
          id="login-help-text"
          className="mt-4 text-xs text-slate-500"
        >
          Your sign-in link will only work on allowed domains configured in
          Supabase Auth. Make sure this site&apos;s URL is added in your
          Supabase project settings.
        </p>
      </div>
    </div>
  );
}
