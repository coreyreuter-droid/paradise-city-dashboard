// components/Admin/BrandingSettingsClient.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { PortalSettings } from "@/lib/queries";

type FormState = {
  city_name: string;
  tagline: string;
  primary_color: string;
  accent_color: string;
  background_color: string;
  logo_url: string;
  hero_message: string;
};

export default function BrandingSettingsClient() {
  // data state
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);
  const [form, setForm] = useState<FormState>({
    city_name: "",
    tagline: "",
    primary_color: "#0f172a",
    accent_color: "#0ea5e9",
    background_color: "#f8fafc",
    logo_url: "",
    hero_message: "",
  });

  function setError(msg: string) {
    setMessage(msg);
    setMessageIsError(true);
  }

  function setInfo(msg: string) {
    setMessage(msg);
    setMessageIsError(false);
  }

  // Load existing settings on mount
  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      setInitialLoading(true);
      setMessage(null);

      const { data, error } = await supabase
        .from("portal_settings")
        .select("*")
        .eq("id", 1)
        .limit(1);

      if (cancelled) return;

      if (error) {
        console.error("load portal_settings error:", error);
        setError("Failed to load current branding settings.");
      } else if (data && data.length > 0) {
        const row = data[0] as PortalSettings;
        setForm({
          city_name: row.city_name ?? "Paradise City",
          tagline: row.tagline ?? "",
          primary_color: row.primary_color ?? "#0f172a",
          accent_color: row.accent_color ?? "#0ea5e9",
          background_color: row.background_color ?? "#f8fafc",
          logo_url: row.logo_url ?? "",
          hero_message:
            row.hero_message ??
            "Use this space to explain your city’s budget priorities and fiscal story.",
        });
      }

      setInitialLoading(false);
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const payload = {
      id: 1,
      city_name: form.city_name.trim() || "Paradise City",
      tagline: form.tagline.trim() || null,
      primary_color: form.primary_color || "#0f172a",
      accent_color: form.accent_color || "#0ea5e9",
      background_color: form.background_color || "#f8fafc",
      logo_url: form.logo_url.trim() || null,
      hero_message: form.hero_message.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("portal_settings")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.error("save portal_settings error:", error);
      setError("Failed to save branding settings: " + error.message);
    } else {
      setInfo("Branding settings saved. Refresh the portal to see changes.");
    }

    setLoading(false);
  }

  // --- main form ---
  return (
    <div className="max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">
        Branding & Portal Settings
      </h1>
      <p className="mb-4 text-sm text-slate-500">
        Configure the city name, logo, colors, and messaging used across
        the public portal. Changes apply to all pages that reference
        these settings.
      </p>

      {initialLoading ? (
        <p className="text-sm text-slate-500">Loading current settings…</p>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                City name
              </label>
              <input
                type="text"
                value={form.city_name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    city_name: e.target.value,
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Paradise City"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Tagline
              </label>
              <input
                type="text"
                value={form.tagline}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    tagline: e.target.value,
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="A friendly tagline for the city"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Hero message / intro text
            </label>
            <textarea
              value={form.hero_message}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  hero_message: e.target.value,
                }))
              }
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Explain what this portal is for, how residents can use it, and what values guide your financial decisions."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Primary color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      primary_color: e.target.value,
                    }))
                  }
                  className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-white"
                />
                <input
                  type="text"
                  value={form.primary_color}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      primary_color: e.target.value,
                    }))
                  }
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-mono"
                  placeholder="#0f172a"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Accent color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.accent_color}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      accent_color: e.target.value,
                    }))
                  }
                  className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-white"
                />
                <input
                  type="text"
                  value={form.accent_color}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      accent_color: e.target.value,
                    }))
                  }
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-mono"
                  placeholder="#0ea5e9"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Background color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.background_color}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      background_color: e.target.value,
                    }))
                  }
                  className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-white"
                />
                <input
                  type="text"
                  value={form.background_color}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      background_color: e.target.value,
                    }))
                  }
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-mono"
                  placeholder="#f8fafc"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Logo URL
            </label>
            <input
              type="text"
              value={form.logo_url}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  logo_url: e.target.value,
                }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="https://example.com/logo.png"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              For now, paste the URL to a hosted image (PNG/SVG). Later we
              can add direct image upload to Supabase storage.
            </p>
            {form.logo_url && (
              <div className="mt-2">
                <div className="text-[11px] text-slate-500">
                  Preview:
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.logo_url}
                  alt="Logo preview"
                  className="mt-1 h-12 w-auto rounded bg-slate-100 p-1"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save settings"}
          </button>

          {message && (
            <div
              className={
                "text-sm " +
                (messageIsError ? "text-red-700" : "text-emerald-700")
              }
            >
              {message}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
