"use client";

import {
  useEffect,
  useState,
  FormEvent,
  ChangeEvent,
} from "react";
import { supabase } from "@/lib/supabase";

type PortalSettings = {
  id: number;
  city_name: string | null;
  tagline: string | null;
  primary_color: string | null;
  accent_color: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
  hero_message: string | null;
  seal_url: string | null;
};

type LoadState = "loading" | "ready" | "error";
type SaveState = "idle" | "saving" | "saved" | "error";

type ThemePreset = {
  id: string;
  label: string;
  primary: string;
  accent: string;
  heroMessage?: string;
};

const THEME_PRESETS: ThemePreset[] = [
  {
    id: "civic-gold",
    label: "Civic gold",
    primary: "#0f172a",
    accent: "#fbbf24",
    heroMessage:
      "Explore how your city allocates and spends public dollars across departments, funds, and programs.",
  },
  {
    id: "civic-blue",
    label: "Civic blue",
    primary: "#0f172a",
    accent: "#0ea5e9",
  },
  {
    id: "county-green",
    label: "County green",
    primary: "#0f172a",
    accent: "#22c55e",
  },
];

export default function BrandingSettingsClient() {
  const [settings, setSettings] = useState<PortalSettings | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [sealFile, setSealFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadState("loading");
      setMessage(null);

      try {
        const { data, error } = await supabase
          .from("portal_settings")
          .select(
            "id, city_name, tagline, primary_color, accent_color, logo_url, hero_image_url, hero_message, seal_url"
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
          const { data: inserted, error: insertError } =
            await supabase
              .from("portal_settings")
              .insert({
                city_name: null,
                tagline: null,
                primary_color: null,
                accent_color: null,
                logo_url: null,
                hero_image_url: null,
                hero_message: null,
                seal_url: null,
              })
              .select(
                "id, city_name, tagline, primary_color, accent_color, logo_url, hero_image_url, hero_message, seal_url"
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

          setSettings(inserted as PortalSettings);
          setLoadState("ready");
          return;
        }

        setSettings(data as PortalSettings);
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

  function handleLogoFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    setImageError(null);
  }

  function handleHeroFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setHeroFile(file);
    setImageError(null);
  }

  function handleSealFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSealFile(file);
    setImageError(null);
  }

  function applyPreset(preset: ThemePreset) {
    if (!settings) return;
    setSettings({
      ...settings,
      primary_color: preset.primary,
      accent_color: preset.accent,
      hero_message: preset.heroMessage ?? settings.hero_message,
    });
    setSaveState("idle");
    setMessage(`Applied preset: ${preset.label}. Save to keep changes.`);
  }

  async function uploadImage(
    file: File,
    kind: "logo" | "hero" | "seal",
    token: string
  ): Promise<string> {
    if (!file.type.startsWith("image/")) {
      throw new Error(
        `${
          kind === "logo" ? "Logo" : kind === "hero" ? "Hero" : "Seal"
        } image must be an image file.`
      );
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("filename", file.name);
    formData.append("kind", kind);

    const res = await fetch("/api/admin/hero-image", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json?.error || "Image upload failed.");
    }

    const url = json.url as string | undefined;
    if (!url) {
      throw new Error("Upload succeeded but no URL returned.");
    }

    return url;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;

    setSaveState("saving");
    setMessage(null);
    setImageError(null);

    try {
      let logoUrl = settings.logo_url ?? null;
      let heroUrl = settings.hero_image_url ?? null;
      let sealUrl = settings.seal_url ?? null;

      const needUpload = !!logoFile || !!heroFile || !!sealFile;

      let token: string | null = null;

      if (needUpload) {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.access_token) {
          console.error("BrandingSettings: no session", sessionError);
          throw new Error(
            "You must be signed in as an admin to upload images."
          );
        }

        token = session.access_token;
      }

      if (logoFile && token) {
        logoUrl = await uploadImage(logoFile, "logo", token);
      }

      if (heroFile && token) {
        heroUrl = await uploadImage(heroFile, "hero", token);
      }

      if (sealFile && token) {
        sealUrl = await uploadImage(sealFile, "seal", token);
      }

      const payload = {
        city_name: settings.city_name,
        tagline: settings.tagline,
        primary_color: settings.primary_color,
        accent_color: settings.accent_color,
        logo_url: logoUrl,
        hero_image_url: heroUrl,
        hero_message: settings.hero_message,
        seal_url: sealUrl,
      };

      const { data, error } = await supabase
        .from("portal_settings")
        .update(payload)
        .eq("id", settings.id)
        .select(
          "id, city_name, tagline, primary_color, accent_color, logo_url, hero_image_url, hero_message, seal_url"
        )
        .maybeSingle();

      if (error || !data) {
        console.error("BrandingSettings: save error", error);
        setSaveState("error");
        setMessage("Failed to save branding settings.");
        return;
      }

      setSettings(data as PortalSettings);
      setSaveState("saved");
      setMessage("Branding settings saved.");
      setLogoFile(null);
      setHeroFile(null);
      setSealFile(null);
    } catch (err: any) {
      console.error("BrandingSettings: unexpected save error", err);
      setSaveState("error");
      setMessage("Unexpected error saving branding settings.");
      if (err?.message) {
        setImageError(err.message);
      }
    }
  }

  if (loadState === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">
            Loading branding settings…
          </p>
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

  if (!settings) return null;

  const previewName = settings.city_name || "Your City Name";
  const previewTagline =
    settings.tagline || "Transparent Budget. Empowered Citizens.";
  const previewPrimary = settings.primary_color || "#0F172A";
  const previewAccent = settings.accent_color || "#0369A1";
  const previewHeroMessage =
    settings.hero_message ||
    "Use this space to introduce your transparency portal.";

  const initials = previewName
    .split(" ")
    .map((w) => w[0] || "")
    .join("")
    .slice(0, 3)
    .toUpperCase();

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
            {/* Presets */}
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Quick color presets
              </p>
              <div className="flex flex-wrap gap-2">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <span
                      className="mr-2 inline-block h-3 w-3 rounded-full border border-slate-200"
                      style={{ backgroundColor: preset.accent }}
                    />
                    {preset.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Presets update the colors (and sometimes hero message). Save
                to apply changes to the public portal.
              </p>
            </div>

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
                onChange={(e) =>
                  handleFieldChange("tagline", e.target.value)
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                placeholder="e.g. Transparent Budget. Empowered Citizens."
              />
              <p className="mt-1 text-xs text-slate-500">
                Short message shown under the city name.
              </p>
            </div>

            {/* Hero message */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Hero message (landing page)
              </label>
              <textarea
                value={settings.hero_message ?? ""}
                onChange={(e) =>
                  handleFieldChange("hero_message", e.target.value)
                }
                rows={3}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                placeholder="Short description shown on the public landing page."
              />
              <p className="mt-1 text-xs text-slate-500">
                Appears in the hero section on the public landing page.
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
                  Used for headers, key accents, and some chart elements.
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
                  placeholder="#0EA5E9"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Used for buttons, highlights, and charts.
                </p>
              </div>
            </div>

            {/* Logo + upload */}
            <div className="space-y-2">
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
                  Main logo shown in the hero and sidebar. Uploading a file
                  below will overwrite this URL when you save.
                </p>
              </div>

              <div className="space-y-1 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
                <p className="font-semibold">
                  Upload logo image (PNG/JPG/WEBP)
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileChange}
                  className="mt-1 text-xs"
                />
                {logoFile && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Selected: {logoFile.name} (will be uploaded when you click{" "}
                    <span className="font-semibold">Save settings</span>)
                  </p>
                )}
              </div>
            </div>

            {/* Hero image + upload */}
            <div className="space-y-2">
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
                  Optional banner image behind the hero section on the public
                  landing page. Uploading a file below will overwrite this URL
                  when you save.
                </p>
              </div>

              <div className="space-y-1 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
                <p className="font-semibold">
                  Upload hero image (PNG/JPG/WEBP)
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleHeroFileChange}
                  className="mt-1 text-xs"
                />
                {heroFile && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Selected: {heroFile.name} (will be uploaded when you click{" "}
                    <span className="font-semibold">Save settings</span>)
                  </p>
                )}
              </div>
            </div>

            {/* Seal + upload */}
            <div className="space-y-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  City seal URL (optional)
                </label>
                <input
                  type="text"
                  value={settings.seal_url ?? ""}
                  onChange={(e) =>
                    handleFieldChange("seal_url", e.target.value)
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder="https://example.com/city-seal.png"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Optional small seal shown in the hero alongside the logo.
                  Uploading a file below will overwrite this URL when you save.
                </p>
              </div>

              <div className="space-y-1 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
                <p className="font-semibold">
                  Upload city seal image (PNG/JPG/WEBP)
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSealFileChange}
                  className="mt-1 text-xs"
                />
                {sealFile && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Selected: {sealFile.name} (will be uploaded when you click{" "}
                    <span className="font-semibold">Save settings</span>)
                  </p>
                )}
              </div>
            </div>

            {imageError && (
              <p className="text-xs text-red-600">{imageError}</p>
            )}

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

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 bg-white">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold uppercase text-white">
                {initials || "CP"}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {previewName}
                </p>
                <p className="text-[11px] text-slate-500">
                  {previewTagline}
                </p>
              </div>
            </div>

            {/* Hero-like preview */}
            <div className="space-y-3 px-4 py-3 text-xs text-slate-600">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p
                  className="mb-1 text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: previewAccent }}
                >
                  Landing hero
                </p>
                <p className="text-[13px] text-slate-800">
                  {previewHeroMessage}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-[11px]">
                  <span
                    className="h-4 w-4 rounded-full border border-slate-200"
                    style={{ backgroundColor: previewPrimary }}
                  />
                  <span className="font-medium text-slate-700">
                    Primary
                  </span>
                  <span className="font-mono text-slate-500">
                    {previewPrimary}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span
                    className="h-4 w-4 rounded-full border border-slate-200"
                    style={{ backgroundColor: previewAccent }}
                  />
                  <span className="font-medium text-slate-700">
                    Accent
                  </span>
                  <span className="font-mono text-slate-500">
                    {previewAccent}
                  </span>
                </div>
              </div>

              <div className="mt-1 space-y-1 text-[11px] text-slate-500">
                <p>
                  Logo:{" "}
                  {settings.logo_url ? (
                    <span className="font-mono">
                      {settings.logo_url}
                    </span>
                  ) : (
                    <span className="italic text-slate-400">
                      not set
                    </span>
                  )}
                </p>
                <p>
                  Hero image:{" "}
                  {settings.hero_image_url ? (
                    <span className="font-mono">
                      {settings.hero_image_url}
                    </span>
                  ) : (
                    <span className="italic text-slate-400">
                      not set
                    </span>
                  )}
                </p>
                <p>
                  City seal:{" "}
                  {settings.seal_url ? (
                    <span className="font-mono">
                      {settings.seal_url}
                    </span>
                  ) : (
                    <span className="italic text-slate-400">
                      not set
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
