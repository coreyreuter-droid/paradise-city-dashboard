"use client";

import { useEffect, useState, FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type PortalSettings = {
  id: number;
  city_name: string | null;
  tagline: string | null;
  primary_color: string | null;
  accent_color: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
};

type LoadState = "loading" | "ready" | "error";
type SaveState = "idle" | "saving" | "saved" | "error";

export default function BrandingSettingsClient() {
  const [settings, setSettings] = useState<PortalSettings | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadState("loading");
      setMessage(null);

      try {
        // Try to load existing portal_settings row
        const { data, error } = await supabase
          .from("portal_settings")
          .select(
            "id, city_name, tagline, primary_color, accent_color, logo_url, hero_image_url"
          )
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error("BrandingSettings: load error", error);
          setLoadState("error");
          setMessage("Failed to load branding settings.");
          return;
        }

        if (!data) {
          // No row yet – create a default one
          const { data: inserted, error: insertError } = await supabase
            .from("portal_settings")
            .insert({
              city_name: null,
              tagline: null,
              primary_color: null,
              accent_color: null,
              logo_url: null,
              hero_image_url: null,
            })
            .select(
              "id, city_name, tagline, primary_color, accent_color, logo_url, hero_image_url"
            )
            .single();

          if (insertError || !inserted) {
            console.error(
              "BrandingSettings: insert default row error",
              insertError
            );
            setLoadState("error");
            setMessage(
              "Could not initialize portal settings row. Please try again or contact support."
            );
            return;
          }

          setSettings(inserted);
          setLoadState("ready");
          return;
        }

        setSettings(data);
        setLoadState("ready");
      } catch (err: any) {
        console.error("BrandingSettings: unexpected load error", err);
        if (!cancelled) {
          setLoadState("error");
          setMessage("Unexpected error loading branding settings.");
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleFieldChange<K extends keyof PortalSettings>(
    key: K,
    value: string
  ) {
    if (!settings) return;
    setSettings({
      ...settings,
      [key]: value === "" ? null : (value as any),
    });
    setSaveState("idle");
    setMessage(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;

    setSaveState("saving");
    setMessage(null);

    try {
      const payload = {
        city_name: settings.city_name,
        tagline: settings.tagline,
        primary_color: settings.primary_color,
        accent_color: settings.accent_color,
        logo_url: settings.logo_url,
        hero_image_url: settings.hero_image_url,
      };

      const { data, error } = await supabase
        .from("portal_settings")
        .update(payload)
        .eq("id", settings.id)
        .select(
          "id, city_name, tagline, primary_color, accent_color, logo_url, hero_image_url"
        )
        .maybeSingle();

      if (error || !data) {
        console.error("BrandingSettings: save error", error);
        setSaveState("error");
        setMessage("Failed to save branding settings.");
        return;
      }

      setSettings(data);
      setSaveState("saved");
      setMessage("Branding settings saved.");
    } catch (err: any) {
      console.error("BrandingSettings: unexpected save error", err);
      setSaveState("error");
      setMessage("Unexpected error saving branding settings.");
    }
  }

  if (loadState === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Loading branding settings…</p>
        </div>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-red-700">
            {message || "Failed to load branding settings."}
          </p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return null;
  }

  const previewName = settings.city_name || "Your City Name";
  const previewTagline =
    settings.tagline || "Transparent Budget. Empowered Citizens.";
  const previewPrimary = settings.primary_color || "#0F172A"; // slate-900
  const previewAccent = settings.accent_color || "#0369A1"; // sky-ish

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 lg:flex-row">
        {/* Form */}
        <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-lg font-semibold text-slate-900">
            Branding &amp; Portal Settings
          </h1>
          <p className="mb-4 text-sm text-slate-600">
            Configure how this CiviPortal deployment appears to residents.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display name */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Portal display name
              </label>
              <input
                type="text"
                value={settings.city_name ?? ""}
                onChange={(e) =>
                  handleFieldChange("city_name", e.target.value)
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                placeholder="e.g. City of Paradise, Johnson County"
              />
              <p className="mt-1 text-xs text-slate-500">
                This name is shown in the header and on public pages.
              </p>
            </div>

            {/* Tagline */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Tagline
              </label>
              <input
                type="text"
                value={settings.tagline ?? ""}
                onChange={(e) => handleFieldChange("tagline", e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                placeholder="e.g. Transparent Budget. Empowered Citizens."
              />
              <p className="mt-1 text-xs text-slate-500">
                Short message shown under the city name.
              </p>
            </div>

            {/* Colors */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Primary color (hex)
                </label>
                <input
                  type="text"
                  value={settings.primary_color ?? ""}
                  onChange={(e) =>
                    handleFieldChange("primary_color", e.target.value)
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder="#0F172A"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Used for headers, buttons, and key accents.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Accent color (hex)
                </label>
                <input
                  type="text"
                  value={settings.accent_color ?? ""}
                  onChange={(e) =>
                    handleFieldChange("accent_color", e.target.value)
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder="#0369A1"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Used for highlights and charts.
                </p>
              </div>
            </div>

            {/* Logo URL */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Logo URL
              </label>
              <input
                type="text"
                value={settings.logo_url ?? ""}
                onChange={(e) =>
                  handleFieldChange("logo_url", e.target.value)
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                placeholder="https://example.com/logo.png"
              />
              <p className="mt-1 text-xs text-slate-500">
                Public URL to your city or county logo. You can use Supabase
                Storage or an external host.
              </p>
            </div>

            {/* Hero image URL */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Hero image URL (optional)
              </label>
              <input
                type="text"
                value={settings.hero_image_url ?? ""}
                onChange={(e) =>
                  handleFieldChange("hero_image_url", e.target.value)
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                placeholder="https://example.com/city-skyline.jpg"
              />
              <p className="mt-1 text-xs text-slate-500">
                Optional banner image for the public portal landing page.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saveState === "saving"}
                className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveState === "saving" ? "Saving…" : "Save settings"}
              </button>
              {message && (
                <p
                  className={
                    "mt-2 text-xs " +
                    (saveState === "error"
                      ? "text-red-700"
                      : "text-slate-600")
                  }
                >
                  {message}
                </p>
              )}
            </div>
          </form>
        </div>

        {/* Preview */}
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Portal preview
          </p>
          <div
            className="rounded-xl border border-slate-200"
            style={{ borderColor: previewPrimary }}
          >
            <div
              className="flex items-center gap-3 rounded-t-xl px-4 py-3"
              style={{ backgroundColor: previewPrimary, color: "#FFFFFF" }}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-bold uppercase">
                {previewName
                  .split(" ")
                  .map((w) => w[0] || "")
                  .join("")
                  .slice(0, 3)}
              </div>
              <div>
                <p className="text-sm font-semibold">{previewName}</p>
                <p className="text-[11px] opacity-80">
                  {previewTagline}
                </p>
              </div>
            </div>
            <div className="px-4 py-3 text-xs text-slate-600">
              <p className="mb-2">
                Primary color:{" "}
                <span className="font-mono">{previewPrimary}</span>
              </p>
              <p className="mb-2">
                Accent color:{" "}
                <span className="font-mono">{previewAccent}</span>
              </p>
              {settings.logo_url && (
                <p className="truncate text-[11px] text-slate-500">
                  Logo: <span className="font-mono">{settings.logo_url}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
