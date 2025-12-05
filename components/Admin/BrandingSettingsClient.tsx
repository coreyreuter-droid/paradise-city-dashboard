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

  leader_name: string | null;
  leader_title: string | null;
  leader_message: string | null;
  leader_photo_url: string | null;

  project1_title: string | null;
  project1_summary: string | null;
  project2_title: string | null;
  project2_summary: string | null;
  project3_title: string | null;
  project3_summary: string | null;

  project1_image_url: string | null;
  project2_image_url: string | null;
  project3_image_url: string | null;

  stat_population: string | null;
  stat_employees: string | null;
  stat_square_miles: string | null;
  stat_annual_budget: string | null;

};

type ProjectTitleKey = "project1_title" | "project2_title" | "project3_title";
type ProjectSummaryKey =
  | "project1_summary"
  | "project2_summary"
  | "project3_summary";

const PROJECT_TITLE_KEYS: ProjectTitleKey[] = [
  "project1_title",
  "project2_title",
  "project3_title",
];

const PROJECT_SUMMARY_KEYS: ProjectSummaryKey[] = [
  "project1_summary",
  "project2_summary",
  "project3_summary",
];

const PROJECT_IMAGE_KEYS = [
  "project1_image_url",
  "project2_image_url",
  "project3_image_url",
] as const;

type ProjectImageKey = (typeof PROJECT_IMAGE_KEYS)[number];

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
    primary: "#0F172A",
    accent: "#0369A1",
  },
  {
    id: "evergreen",
    name: "Evergreen",
    primary: "#064E3B",
    accent: "#047857",
  },
  {
    id: "sunrise",
    name: "Sunrise",
    primary: "#7C2D12",
    accent: "#EA580C",
  },
  {
    id: "lakefront",
    name: "Lakefront",
    primary: "#0C4A6E",
    accent: "#22C55E",
  },
];

const SELECT_FIELDS = [
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
  "leader_name",
  "leader_title",
  "leader_message",
  "leader_photo_url",
  "project1_title",
  "project1_summary",
  "project2_title",
  "project2_summary",
  "project3_title",
  "project3_summary",
  "project1_image_url",
  "project2_image_url",
  "project3_image_url",
  "stat_population",
  "stat_employees",
  "stat_square_miles",
  "stat_annual_budget",
].join(", ");

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
  const [projectFiles, setProjectFiles] = useState<(File | null)[]>([
    null,
    null,
    null,
  ]);

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
          .select(SELECT_FIELDS)
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
                  leader_name: null,
                  leader_title: null,
                  leader_message: null,
                  leader_photo_url: null,
                  project1_title: null,
                  project1_summary: null,
                  project2_title: null,
                  project2_summary: null,
                  project3_title: null,
                  project3_summary: null,
                  project1_image_url: null,
                  project2_image_url: null,
                  project3_image_url: null,
                  stat_population: null,
                  stat_employees: null,
                  stat_square_miles: null,
                  stat_annual_budget: null,
                })
                .select(SELECT_FIELDS)
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

  function handleProjectFileChange(
    index: number,
    e: ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0] ?? null;
    setProjectFiles((prev) => {
      const next = [...prev];
      next[index] = file;
      return next;
    });
  }

  async function uploadImageToBucket(
    file: File,
    bucket: "branding",
    prefix: "logos" | "heroes" | "seals" | "projects"
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
      let projectImageUrls: (string | null)[] = [
        settings.project1_image_url ?? null,
        settings.project2_image_url ?? null,
        settings.project3_image_url ?? null,
      ];

      if (logoFile) {
        logoUrl = await uploadImageToBucket(
          logoFile,
          "branding",
          "logos"
        );
      }

      if (heroFile) {
        heroUrl = await uploadImageToBucket(
          heroFile,
          "branding",
          "heroes"
        );
      }

      if (sealFile) {
        sealUrl = await uploadImageToBucket(
          sealFile,
          "branding",
          "seals"
        );
      }

      // Upload any project images that were selected
      for (let i = 0; i < projectFiles.length; i++) {
        const file = projectFiles[i];
        if (!file) continue;

        const url = await uploadImageToBucket(
          file,
          "branding",
          "projects"
        );
        projectImageUrls[i] = url;
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
          leader_name: settings.leader_name,
          leader_title: settings.leader_title,
          leader_message: settings.leader_message,
          leader_photo_url: settings.leader_photo_url,
          project1_title: settings.project1_title,
          project1_summary: settings.project1_summary,
          project2_title: settings.project2_title,
          project2_summary: settings.project2_summary,
          project3_title: settings.project3_title,
          project3_summary: settings.project3_summary,
          project1_image_url: projectImageUrls[0],
          project2_image_url: projectImageUrls[1],
          project3_image_url: projectImageUrls[2],
          stat_population: settings.stat_population,
          stat_employees: settings.stat_employees,
          stat_square_miles: settings.stat_square_miles,
          stat_annual_budget: settings.stat_annual_budget,
        })
        .eq("id", settings.id)
        .select(SELECT_FIELDS)
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
      setProjectFiles([null, null, null]);
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

        {/* Single full-width form card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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

            {/* Leadership / welcome message */}
            <div className="border-t border-slate-200 pt-4 mt-4 space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Leadership welcome (optional)
              </h2>
              <p className="text-xs text-slate-500">
                Share a short message from the mayor or city manager about the
                city’s commitment to transparency.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Leader name
                  </label>
                  <input
                    type="text"
                    value={settings.leader_name ?? ""}
                    onChange={(e) =>
                      handleFieldChange("leader_name", e.target.value)
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    placeholder="e.g. Jane Doe"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Leader title
                  </label>
                  <input
                    type="text"
                    value={settings.leader_title ?? ""}
                    onChange={(e) =>
                      handleFieldChange("leader_title", e.target.value)
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    placeholder="e.g. City Manager"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Leader message
                </label>
                <textarea
                  value={settings.leader_message ?? ""}
                  onChange={(e) =>
                    handleFieldChange("leader_message", e.target.value)
                  }
                  rows={4}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder="A short welcome note about transparency, stewardship of public funds, and how residents can use this portal."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Leader photo URL (optional)
                </label>
                <input
                  type="text"
                  value={settings.leader_photo_url ?? ""}
                  onChange={(e) =>
                    handleFieldChange("leader_photo_url", e.target.value)
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder="https://example.com/leader.jpg"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Optional photo shown next to the welcome message on the landing
                  page.
                </p>
              </div>
            </div>

{/* City stats */}
<div className="border-t border-slate-200 pt-4 mt-4 space-y-3">
  <h2 className="text-sm font-semibold text-slate-900">
    City stats (optional)
  </h2>
  <p className="text-xs text-slate-500">
    Key figures that help residents understand the size and scale of
    your community.
  </p>

  <div className="grid gap-4 sm:grid-cols-2">
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        Population
      </label>
      <input
        type="text"
        value={settings.stat_population ?? ""}
        onChange={(e) =>
          handleFieldChange("stat_population", e.target.value)
        }
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        placeholder="e.g. 54,231"
      />
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        City employees
      </label>
      <input
        type="text"
        value={settings.stat_employees ?? ""}
        onChange={(e) =>
          handleFieldChange("stat_employees", e.target.value)
        }
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        placeholder="e.g. 312"
      />
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        Area (square miles)
      </label>
      <input
        type="text"
        value={settings.stat_square_miles ?? ""}
        onChange={(e) =>
          handleFieldChange("stat_square_miles", e.target.value)
        }
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        placeholder="e.g. 35.8"
      />
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        Annual budget (all funds)
      </label>
      <input
        type="text"
        value={settings.stat_annual_budget ?? ""}
        onChange={(e) =>
          handleFieldChange("stat_annual_budget", e.target.value)
        }
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        placeholder="e.g. 98300000"
      />
      <p className="mt-1 text-xs text-slate-500">
        Enter as a whole number (e.g. 98300000). It will be formatted as
        currency on the public site.
      </p>
    </div>
  </div>
</div>

            {/* Featured projects */}
            <div className="border-t border-slate-200 pt-4 mt-4 space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Featured projects (optional)
              </h2>
              <p className="text-xs text-slate-500">
                Highlight 1–3 major capital or community projects. These appear in
                a projects section on the landing page.
              </p>

              {PROJECT_TITLE_KEYS.map((titleKey, idx) => {
                const summaryKey = PROJECT_SUMMARY_KEYS[idx];
                const imageKey: ProjectImageKey = PROJECT_IMAGE_KEYS[idx];

                const titleValue = settings[titleKey] ?? "";
                const summaryValue = settings[summaryKey] ?? "";
                const imageValue = settings[imageKey] ?? "";

                return (
                  <div
                    key={titleKey}
                    className="rounded-md border border-slate-200 bg-slate-50/60 p-3 space-y-2"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Project {idx + 1}
                    </p>

                    {/* Title */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">
                        Title
                      </label>
                      <input
                        type="text"
                        value={titleValue}
                        onChange={(e) =>
                          handleFieldChange(titleKey, e.target.value)
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        placeholder="e.g. New Community Center"
                      />
                    </div>

                    {/* Summary */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">
                        Summary
                      </label>
                      <textarea
                        value={summaryValue}
                        onChange={(e) =>
                          handleFieldChange(summaryKey, e.target.value)
                        }
                        rows={3}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        placeholder="Briefly describe the project, what it delivers, and its impact on residents."
                      />
                    </div>

                    {/* Image URL */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">
                        Image URL (optional)
                      </label>
                      <input
                        type="text"
                        value={imageValue}
                        onChange={(e) =>
                          handleFieldChange(imageKey, e.target.value)
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        placeholder="https://example.com/project.jpg"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">
                        Optional image shown at the top of this project card on the
                        landing page.
                      </p>
                    </div>

                    {/* Project image upload */}
                    <div className="space-y-1 rounded-md bg-slate-50 p-2 text-[11px] text-slate-600">
                      <p className="font-semibold">
                        Upload project image (PNG/JPG/WEBP)
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleProjectFileChange(idx, e)}
                        className="mt-1 text-[11px]"
                      />
                      {projectFiles[idx] && (
                        <p className="mt-1 text-[11px] text-slate-500">
                          Selected: {projectFiles[idx]?.name} (will be uploaded when you
                          click{" "}
                          <span className="font-semibold">Save settings</span>)
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
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
      </div>
    </div>
  );
}
