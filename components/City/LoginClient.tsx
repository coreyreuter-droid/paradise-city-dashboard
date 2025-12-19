// components/City/LoginClient.tsx
"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { CITY_CONFIG } from "@/lib/cityConfig";
import { cityHref } from "@/lib/cityRouting";

type Props = {
  redirect: string;
  cityName?: string | null;
};

export default function LoginClient({ redirect, cityName }: Props) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null
  );

  const messageRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Focus email input on load
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if ((successMessage || errorMessage) && messageRef.current) {
      messageRef.current.focus();
    }
  }, [successMessage, errorMessage]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage("Enter a work email address.");
      setSuccessMessage(null);
      return;
    }

    setSending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        // NOTE: We keep redirect available as a prop for future use if you
        // configure Supabase emailRedirectTo. For now, we rely on your
        // Supabase project's redirect URL configuration.
        // options: { emailRedirectTo: redirect },
      });

      if (error) {
        console.error("LoginClient: signInWithOtp error", error);
        setErrorMessage(
          error.message ||
            "Could not send sign-in link. Please try again."
        );
        setSuccessMessage(null);
      } else {
        setSuccessMessage(
          "Check your email for a secure sign-in link. You can close this tab after you click the link."
        );
        setErrorMessage(null);
      }
    } catch (err: any) {
      console.error("LoginClient: unexpected error", err);
      setErrorMessage(
        err?.message ||
          "Unexpected error sending sign-in link. Please try again."
      );
      setSuccessMessage(null);
    } finally {
      setSending(false);
    }
  }

const displayCityName = cityName || CITY_CONFIG.displayName || "Your City";


  return (
    <main
      id="main-content"
      role="main"
      aria-labelledby="login-title"
      className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-6 sm:py-7">
        <header className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {displayCityName}
          </p>
          <h1
            id="login-title"
            className="mt-1 text-base font-semibold text-slate-900"
          >
            Admin sign-in
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Sign in with your work email to access the CiviPortal admin
            tools. You&apos;ll receive a secure magic link by email.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-3"
          aria-label="Magic link sign-in form"
        >
          <div>
            <label
              htmlFor="login-email"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Work email address
            </label>
            <input
              id="login-email"
              ref={inputRef}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@city.gov"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            />
            <p className="mt-1 text-xs text-slate-500">
              Use the email address your administrator added to this
              portal.
            </p>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            {sending ? "Sending sign-in link…" : "Send sign-in link"}
          </button>
        </form>

        {(successMessage || errorMessage) && (
          <div
            ref={messageRef}
            tabIndex={-1}
            className="mt-4 rounded-md border px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            role={errorMessage ? "alert" : "status"}
            aria-live={errorMessage ? "assertive" : "polite"}
          >
            {successMessage && (
              <p className="text-emerald-700">{successMessage}</p>
            )}
            {errorMessage && (
              <p className="text-red-700">{errorMessage}</p>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2 text-xs text-slate-600">
          <Link
            href={cityHref("/")}
            className="font-medium text-slate-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            Return to public site
          </Link>
          <span className="text-[11px] text-slate-500">
            Need access? Contact a portal admin.
          </span>
        </div>
      </div>
    </main>
  );
}
