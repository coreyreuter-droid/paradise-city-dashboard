// components/Admin/BrandingSettingsClient.tsx
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
  story_city_description: string | null;
  story_year_achievements: string | null;
  story_capital_projects: string | null;
};

type LoadState = "idle" | "loading" | "ready" | "error";
type SaveState = "idle" | "saving" | "saved" | "error";

type ThemePreset = {
  id: string;
  name: string;
  primary: string;
  accent: string;
};

const THEME_PRESETS: ThemePreset[] = [
  {
    id: "civic-classic",
    name: "Civic Classic",
    primary: "#0F172A", // slate-900
    accent: "#0369A1", // sky-700
  },
  {
    id: "evergreen",
    name: "Evergreen",
    primary: "#064E3B", // emerald-900
    accent: "#047857", // emerald-600
  },
  {
    id: "sunrise",
    name: "Sunrise",
    primary: "#7C2D12", // amber/brown
    accent: "#EA580C", // orange-600
  },
  {
    id: "lakefront",
    name: "Lakefront",
    primary: "#0C4A6E", // sky-900
    accent: "#22C55E", // green-500
  },
];

export default function BrandingSettingsClient() {
  const [settings, setSettings] = useState<PortalSettings | null>(
    null
  );
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [sealFile, setSealFile] = useState<File | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadState("loading");
      setMessage(null);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        setLoadState("error");
        setMessage(
          "You must be signed in as an admin to view portal settings."
        );
        return;
      }

      try {
        const { data, error } = await supabase
          .from("portal_settings")
          .select(
            [
              "id",
              "city_name",
              "tagline",
              "primary_color",
              "accent_color",
              "logo_url",
              "hero_image_url",
              "hero_message",
              "seal_url",
              "story_city_description",
              "story_year_achievements",
              "story_capital_projects",
            ].join(", ")
          )
          .single();

        if (error) {
          if (
            error.code === "PGRST116" ||
            error.message?.includes("0 rows")
          ) {
            const { data: inserted, error: insertError } =
              await supabase
                .from("portal_settings")
                .insert({
                  city_name: "Your City Name",
                  tagline: "Transparent Budget. Empowered Citizens.",
                  primary_color: "#0F172A",
                  accent_color: "#0369A1",
                  hero_message:
                    "Use this space to introduce your transparency portal.",
                  story_city_description: null,
                  story_year_achievements: null,
                  story_capital_projects: null,
                })
                .select(
                  [
                    "id",
                    "city_name",
                    "tagline",
                    "primary_color",
                    "accent_color",
                    "logo_url",
                    "hero_image_url",
                    "hero_message",
                    "seal_url",
                    "story_city_description",
                    "story_year_achievements",
                    "story_capital_projects",
                  ].join(", ")
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

            setSettings(inserted as unknown as PortalSettings);
            setLoadState("ready");
            return;
          }

          console.error("BrandingSettings: load error", error);
          setLoadState("error");
          setMessage(
            "Could not load portal settings. Please try again or contact support."
          );
          return;
        }

        if (!data) {
          setLoadState("error");
          setMessage("No portal settings row found.");
          return;
        }

        if (!cancelled) {
          setSettings(data as unknown as PortalSettings);
          setLoadState("ready");
        }
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
      [key]: value,
    });
  }

  function handleLogoFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
  }

  function handleHeroFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setHeroFile(file);
  }

  function handleSealFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSealFile(file);
  }

  async function uploadImageToBucket(
    file: File,
    bucket: "branding-assets",
    prefix: "logos" | "heroes" | "seals"
  ): Promise<string> {
    const safeName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9.\-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const path = `${prefix}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("BrandingSettings: upload error", uploadError);
      throw new Error(
        uploadError.message ||
          "Could not upload image. Please try a smaller file."
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path);

    if (!publicUrl) {
      throw new Error("Upload succeeded but no URL returned.");
    }

    return publicUrl;
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

      if (logoFile) {
        logoUrl = await uploadImageToBucket(
          logoFile,
          "branding-assets",
          "logos"
        );
      }

      if (heroFile) {
        heroUrl = await uploadImageToBucket(
          heroFile,
          "branding-assets",
          "heroes"
        );
      }

      if (sealFile) {
        sealUrl = await uploadImageToBucket(
          sealFile,
          "branding-assets",
          "seals"
        );
      }

      const { data, error } = await supabase
        .from("portal_settings")
        .update({
          city_name: settings.city_name,
          tagline: settings.tagline,
          primary_color: settings.primary_color,
          accent_color: settings.accent_color,
          logo_url: logoUrl,
          hero_image_url: heroUrl,
          hero_message: settings.hero_message,
          seal_url: sealUrl,
          story_city_description: settings.story_city_description,
          story_year_achievements: settings.story_year_achievements,
          story_capital_projects: settings.story_capital_projects,
        })
        .eq("id", settings.id)
        .select(
          [
            "id",
            "city_name",
            "tagline",
            "primary_color",
            "accent_color",
            "logo_url",
            "hero_image_url",
            "hero_message",
            "seal_url",
            "story_city_description",
            "story_year_achievements",
            "story_capital_projects",
          ].join(", ")
        )
        .single();

      if (error || !data) {
        console.error("BrandingSettings: save error", error);
        setSaveState("error");
        setMessage(
          "Could not save branding settings. Please try again or contact support."
        );
        return;
      }

      setSettings(data as unknown as PortalSettings);
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
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-900">
            Portal branding
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Control how your city&apos;s CiviPortal appears on the public
            site.
          </p>
        </div>

        {message && (
          <div
            className={
              "mb-4 rounded-md border px-3 py-2 text-sm " +
              (saveState === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800")
            }
          >
            {message}
          </div>
        )}


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
                      onClick={() => {
                        setSettings({
                          ...settings,
                          primary_color: preset.primary,
                          accent_color: preset.accent,
                        });
                      }}
                      className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:border-slate-300"
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: preset.accent }}
                      />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* City name */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  City name
                </label>
                <input
                  type="text"
                  value={settings.city_name ?? ""}
                  onChange={(e) =>
                    handleFieldChange("city_name", e.target.value)
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder="e.g. City of Example"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Displayed prominently in the hero and header.
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
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
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
                  className="min-h-[80px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder="Welcome residents. Explore your city’s budget, spending, and financial health — all in one place."
                />
                <p className="mt-1 text-xs text-slate-500">
                  This text appears in the public hero section on the
                  overview page.
                </p>
              </div>

              {/* Story: City description */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  City description (About our community)
                </label>
                <textarea
                  value={settings.story_city_description ?? ""}
                  onChange={(e) =>
                    handleFieldChange(
                      "story_city_description",
                      e.target.value
                    )
                  }
                  rows={4}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder="Describe your community: population, location, and what makes it unique."
                />
                <p className="mt-1 text-xs text-slate-500">
                  Shown in the “About our community” card on the public
                  landing page.
                </p>
              </div>

              {/* Story: Year achievements */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Year-in-review accomplishments
                </label>
                <textarea
                  value={settings.story_year_achievements ?? ""}
                  onChange={(e) =>
                    handleFieldChange(
                      "story_year_achievements",
                      e.target.value
                    )
                  }
                  rows={4}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder="Summarize key accomplishments, new services, and improvements delivered this fiscal year."
                />
                <p className="mt-1 text-xs text-slate-500">
                  Shown in the “Year in review” card on the public landing
                  page.
                </p>
              </div>

              {/* Story: Capital projects */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Capital projects highlight
                </label>
                <textarea
                  value={settings.story_capital_projects ?? ""}
                  onChange={(e) =>
                    handleFieldChange(
                      "story_capital_projects",
                      e.target.value
                    )
                  }
                  rows={4}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder="Call out major capital projects completed or underway (streets, facilities, parks, utilities)."
                />
                <p className="mt-1 text-xs text-slate-500">
                  Shown in the “Capital projects” card on the public
                  landing page.
                </p>
              </div>

              {/* Colors */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Primary color (hex)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={settings.primary_color ?? ""}
                      onChange={(e) =>
                        handleFieldChange(
                          "primary_color",
                          e.target.value
                        )
                      }
                      className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                      placeholder="#0F172A"
                    />
                    <input
                      type="color"
                      value={settings.primary_color ?? "#0F172A"}
                      onChange={(e) =>
                        handleFieldChange(
                          "primary_color",
                          e.target.value
                        )
                      }
                      aria-label="Pick primary color"
                      className="h-9 w-10 cursor-pointer rounded border border-slate-300 bg-white"
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Used for headers, key text, and high-emphasis elements.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Accent color (hex)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={settings.accent_color ?? ""}
                      onChange={(e) =>
                        handleFieldChange(
                          "accent_color",
                          e.target.value
                        )
                      }
                      className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                      placeholder="#0369A1"
                    />
                    <input
                      type="color"
                      value={settings.accent_color ?? "#0369A1"}
                      onChange={(e) =>
                        handleFieldChange(
                          "accent_color",
                          e.target.value
                        )
                      }
                      aria-label="Pick accent color"
                      className="h-9 w-10 cursor-pointer rounded border border-slate-300 bg-white"
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Used for highlights, buttons, and charts.
                  </p>
                </div>
              </div>

              {/* Logo URL + upload */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Logo image URL
                  </label>
                  <input
                    type="text"
                    value={settings.logo_url ?? ""}
                    onChange={(e) =>
                      handleFieldChange("logo_url", e.target.value)
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
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
                    <p className="mt-1 text-xs text-slate-500">
                      Selected: {logoFile.name} (will be uploaded when you
                      click{" "}
                      <span className="font-semibold">Save settings</span>)
                    </p>
                  )}
                </div>
              </div>

              {/* Hero image + upload */}
              <div className="space-y-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Hero image URL
                  </label>
                  <input
                    type="text"
                    value={settings.hero_image_url ?? ""}
                    onChange={(e) =>
                      handleFieldChange(
                        "hero_image_url",
                        e.target.value
                      )
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    placeholder="https://example.com/hero.jpg"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Large hero background on the overview page. Uploading a
                    file below will overwrite this URL when you save.
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
                    <p className="mt-1 text-xs text-slate-500">
                      Selected: {heroFile.name} (will be uploaded when you
                      click{" "}
                      <span className="font-semibold">Save settings</span>)
                    </p>
                  )}
                </div>
              </div>

              {/* Seal URL + upload */}
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
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    placeholder="https://example.com/seal.png"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Optional city seal displayed alongside the logo in some
                    layouts.
                  </p>
                </div>
                <div className="space-y-1 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
                  <p className="font-semibold">
                    Upload city seal (PNG/JPG/WEBP)
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSealFileChange}
                    className="mt-1 text-xs"
                  />
                  {sealFile && (
                    <p className="mt-1 text-xs text-slate-500">
                      Selected: {sealFile.name} (will be uploaded when you
                      click{" "}
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
                  className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                >
                  {saveState === "saving"
                    ? "Saving…"
                    : "Save branding settings"}
                </button>
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
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                  {settings.logo_url ? (
                    <div className="flex h-9 w-24 items-center justify-center rounded-md bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={settings.logo_url}
                        alt={`${previewName} logo`}
                        className="max-h-8 w-auto object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold uppercase text-white">
                      {initials || "CP"}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {previewName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {previewTagline}
                    </p>
                  </div>
                </div>
                {settings.seal_url && (
                  <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white p-0.5 sm:flex">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={settings.seal_url}
                      alt={`${previewName} seal`}
                      className="h-full w-full rounded-full object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Hero-like preview */}
              <div className="space-y-3 px-4 py-3 text-xs text-slate-600">
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <div
                    className="relative h-24 w-full"
                    style={
                      settings.hero_image_url
                        ? {
                            backgroundImage: `url(${settings.hero_image_url})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : {
                            backgroundImage: `linear-gradient(135deg, ${previewPrimary}, ${previewAccent})`,
                          }
                    }
                  >
                    <div className="absolute inset-0 bg-black/25" />
                    <div className="relative flex h-full flex-col justify-center px-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-100">
                        Landing hero
                      </p>
                      <p className="text-[13px] text-slate-50">
                        {previewHeroMessage}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-xs">
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
                  <div className="flex items-center gap-2 text-xs">
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

                <div className="mt-1 space-y-1 text-xs text-slate-500">
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
    </div>
  );
}
