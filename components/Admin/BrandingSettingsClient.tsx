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
  background_color: string | null;
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

  // toggles
  show_leadership: boolean | null;
  show_story: boolean | null;
  show_year_review: boolean | null;
  show_capital_projects: boolean | null;
  show_stats: boolean | null;
  show_projects: boolean | null;
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
  "background_color",
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
  "show_leadership",
  "show_story",
  "show_year_review",
  "show_capital_projects",
  "show_stats",
  "show_projects",
].join(", ");

export default function BrandingSettingsClient() {
  const [settings, setSettings] = useState<PortalSettings | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

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
            const { data: inserted, error: insertError } = await supabase
              .from("portal_settings")
              .insert({
                city_name: "Your City Name",
                tagline: "Transparent Budget. Empowered Citizens.",
                primary_color: "#0F172A",
                accent_color: "#0369A1",
                background_color: "#020617",
                logo_url: null,
                hero_image_url: null,
                hero_message:
                  "Use this space to introduce your transparency portal.",
                seal_url: null,
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
                show_leadership: true,
                show_story: true,
                show_year_review: true,
                show_capital_projects: true,
                show_stats: true,
                show_projects: true,
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
            setDirty(false);
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
          setDirty(false);
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

  // Auto-clear "saved" state after a short delay
  useEffect(() => {
    if (saveState === "saved") {
      const t = setTimeout(() => {
        setSaveState("idle");
        setMessage(null);
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [saveState]);

  function handleFieldChange<K extends keyof PortalSettings>(
    key: K,
    value: PortalSettings[K]
  ) {
    if (!settings) return;
    setSettings({
      ...settings,
      [key]: value,
    });
    setDirty(true);
  }

  function handleLogoFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    if (file) setDirty(true);
  }

  function handleHeroFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setHeroFile(file);
    if (file) setDirty(true);
  }

  function handleSealFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSealFile(file);
    if (file) setDirty(true);
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
    if (file) setDirty(true);
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
        logoUrl = await uploadImageToBucket(logoFile, "branding", "logos");
      }

      if (heroFile) {
        heroUrl = await uploadImageToBucket(heroFile, "branding", "heroes");
      }

      if (sealFile) {
        sealUrl = await uploadImageToBucket(sealFile, "branding", "seals");
      }

      for (let i = 0; i < projectFiles.length; i++) {
        const file = projectFiles[i];
        if (!file) continue;

        const url = await uploadImageToBucket(file, "branding", "projects");
        projectImageUrls[i] = url;
      }

      const { data, error } = await supabase
        .from("portal_settings")
        .update({
          city_name: settings.city_name,
          tagline: settings.tagline,
          primary_color: settings.primary_color,
          accent_color: settings.accent_color,
          background_color: settings.background_color,
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
          show_leadership: settings.show_leadership,
          show_story: settings.show_story,
          show_year_review: settings.show_year_review,
          show_capital_projects: settings.show_capital_projects,
          show_stats: settings.show_stats,
          show_projects: settings.show_projects,
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
      setDirty(false);
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

  const showSaveBar =
    loadState === "ready" &&
    (dirty ||
      saveState === "saving" ||
      saveState === "error" ||
      saveState === "saved");

  return (
    <div className="min-h-screen bg-slate-50 px-4 pt-10 pb-24">
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

        {/* Single full-width form card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-lg font-semibold text-slate-900">
            Branding &amp; Portal Settings
          </h1>
          <p className="mb-4 text-sm text-slate-600">
            Configure how this CiviPortal deployment appears to residents.
          </p>

          <form
            id="branding-settings-form"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
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
                      setDirty(true);
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

            {/* Content visibility */}
            <div className="mt-4 border-t border-slate-200 pt-4 space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Landing content visibility
              </h2>
              <p className="text-xs text-slate-500">
                Turn sections on or off for your public landing page. All
                sections are enabled by default.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Leadership */}
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    checked={settings.show_leadership !== false}
                    onChange={(e) =>
                      handleFieldChange(
                        "show_leadership",
                        e.target.checked as PortalSettings["show_leadership"]
                      )
                    }
                  />
                  <span className="text-xs">
                    <span className="font-medium">
                      Leadership message
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      Welcome note from mayor / city manager.
                    </span>
                  </span>
                </label>

                {/* Story / About our community */}
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    checked={settings.show_story !== false}
                    onChange={(e) =>
                      handleFieldChange(
                        "show_story",
                        e.target.checked as PortalSettings["show_story"]
                      )
                    }
                  />
                  <span className="text-xs">
                    <span className="font-medium">
                      About our community
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      Narrative description of your city or county.
                    </span>
                  </span>
                </label>

                {/* Year in review */}
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    checked={settings.show_year_review !== false}
                    onChange={(e) =>
                      handleFieldChange(
                        "show_year_review",
                        e.target.checked as PortalSettings["show_year_review"]
                      )
                    }
                  />
                  <span className="text-xs">
                    <span className="font-medium">Year in review</span>
                    <span className="block text-[11px] text-slate-500">
                      Highlights from the current fiscal year.
                    </span>
                  </span>
                </label>

                {/* Capital projects */}
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    checked={settings.show_capital_projects !== false}
                    onChange={(e) =>
                      handleFieldChange(
                        "show_capital_projects",
                        e.target.checked as PortalSettings["show_capital_projects"]
                      )
                    }
                  />
                  <span className="text-xs">
                    <span className="font-medium">
                      Capital projects
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      Summary of major infrastructure investments.
                    </span>
                  </span>
                </label>

                {/* Stats row */}
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    checked={settings.show_stats !== false}
                    onChange={(e) =>
                      handleFieldChange(
                        "show_stats",
                        e.target.checked as PortalSettings["show_stats"]
                      )
                    }
                  />
                  <span className="text-xs">
                    <span className="font-medium">City stats</span>
                    <span className="block text-[11px] text-slate-500">
                      Population, employees, area, and annual budget.
                    </span>
                  </span>
                </label>

                {/* Featured projects */}
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    checked={settings.show_projects !== false}
                    onChange={(e) =>
                      handleFieldChange(
                        "show_projects",
                        e.target.checked as PortalSettings["show_projects"]
                      )
                    }
                  />
                  <span className="text-xs">
                    <span className="font-medium">
                      Featured projects
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      Grid of 1–3 highlighted projects with images.
                    </span>
                  </span>
                </label>
              </div>
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
            <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
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
            <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
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
                    Enter as a whole number (e.g. 98300000). It will be
                    formatted as currency on the public site.
                  </p>
                </div>
              </div>
            </div>

            {/* Featured projects */}
            <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Featured projects (optional)
              </h2>
              <p className="text-xs text-slate-500">
                Highlight 1–3 major capital or community projects. These appear
                in a projects section on the landing page.
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
                    className="space-y-2 rounded-md border border-slate-200 bg-slate-50/60 p-3"
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
                        Optional image shown at the top of this project card on
                        the landing page.
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
                          Selected: {projectFiles[idx]?.name} (will be uploaded
                          when you click{" "}
                          <span className="font-semibold">
                            Save settings
                          </span>
                          ).
                        </p>
                      )}

                      {(imageValue || projectFiles[idx]) && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-14 w-24 overflow-hidden rounded-md border border-slate-200 bg-white">
                            {projectFiles[idx] ? (
                              <img
                                src={URL.createObjectURL(
                                  projectFiles[idx] as File
                                )}
                                alt={`Project ${idx + 1} preview`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              imageValue && (
                                <img
                                  src={imageValue}
                                  alt={`Project ${idx + 1} preview`}
                                  className="h-full w-full object-cover"
                                />
                              )
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Preview. New uploads appear after you save.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Colors */}
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {/* Primary color */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Primary color (hex)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={settings.primary_color ?? ""}
                    onChange={(e) =>
                      handleFieldChange("primary_color", e.target.value)
                    }
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    placeholder="#0F172A"
                  />
                  <input
                    type="color"
                    value={settings.primary_color ?? "#0F172A"}
                    onChange={(e) =>
                      handleFieldChange("primary_color", e.target.value)
                    }
                    aria-label="Pick primary color"
                    className="h-9 w-10 cursor-pointer rounded border border-slate-300 bg-white"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Used for headers, key text, and high-emphasis elements.
                </p>
              </div>

              {/* Accent color */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Accent color (hex)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={settings.accent_color ?? ""}
                    onChange={(e) =>
                      handleFieldChange("accent_color", e.target.value)
                    }
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    placeholder="#0369A1"
                  />
                  <input
                    type="color"
                    value={settings.accent_color ?? "#0369A1"}
                    onChange={(e) =>
                      handleFieldChange("accent_color", e.target.value)
                    }
                    aria-label="Pick accent color"
                    className="h-9 w-10 cursor-pointer rounded border border-slate-300 bg-white"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Used for highlights, buttons, and charts.
                </p>
              </div>

              {/* Background color */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Background color (hex)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={settings.background_color ?? ""}
                    onChange={(e) =>
                      handleFieldChange("background_color", e.target.value)
                    }
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    placeholder="#020617"
                  />
                  <input
                    type="color"
                    value={settings.background_color ?? "#020617"}
                    onChange={(e) =>
                      handleFieldChange("background_color", e.target.value)
                    }
                    aria-label="Pick background color"
                    className="h-9 w-10 cursor-pointer rounded border border-slate-300 bg-white"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Used behind the hero area and dashboard shell.
                </p>
              </div>
            </div>

            {/* Logo URL + upload */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                  <p className="mt-1 text-xs text-slate-500">
                    Selected: {logoFile.name} (will be uploaded when you
                    click{" "}
                    <span className="font-semibold">Save settings</span>).
                  </p>
                )}

                {(settings.logo_url || logoFile) && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-10 w-10 overflow-hidden rounded-md border border-slate-200 bg-white">
                      {logoFile ? (
                        <img
                          src={URL.createObjectURL(logoFile)}
                          alt="Logo preview"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        settings.logo_url && (
                          <img
                            src={settings.logo_url}
                            alt="Logo preview"
                            className="h-full w-full object-contain"
                          />
                        )
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Preview. New uploads appear after you save.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Hero image + upload */}
            <div className="mt-4 space-y-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Hero image URL
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <input
                    type="text"
                    value={settings.hero_image_url ?? ""}
                    onChange={(e) =>
                      handleFieldChange("hero_image_url", e.target.value)
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    placeholder="https://example.com/hero.jpg"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Large hero background on the landing and overview pages.
                    Uploading a file below will overwrite this URL when you
                    save.
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
                      <span className="font-semibold">Save settings</span>).
                    </p>
                  )}

                  {(settings.hero_image_url || heroFile) && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-14 w-24 overflow-hidden rounded-md border border-slate-200 bg-white">
                        {heroFile ? (
                          <img
                            src={URL.createObjectURL(heroFile)}
                            alt="Hero image preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          settings.hero_image_url && (
                            <img
                              src={settings.hero_image_url}
                              alt="Hero image preview"
                              className="h-full w-full object-cover"
                            />
                          )
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Preview. New uploads appear after you save.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* City seal */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
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
                  placeholder="https://example.com/seal.png"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Optional city seal displayed alongside your branding.
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
                    <span className="font-semibold">Save settings</span>).
                  </p>
                )}

                {(settings.seal_url || sealFile) && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-10 w-10 overflow-hidden rounded-md border border-slate-200 bg-white">
                      {sealFile ? (
                        <img
                          src={URL.createObjectURL(sealFile)}
                          alt="City seal preview"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        settings.seal_url && (
                          <img
                            src={settings.seal_url}
                            alt="City seal preview"
                            className="h-full w-full object-contain"
                          />
                        )
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Preview. New uploads appear after you save.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {imageError && (
              <p className="text-xs text-red-600">{imageError}</p>
            )}

            {/* Bottom in-form button (still useful, but sticky bar is primary) */}
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

      {/* Sticky save bar */}
      {showSaveBar && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 shadow-[0_-4px_12px_rgba(15,23,42,0.15)]">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              {saveState === "error" ? (
                <p className="truncate text-xs text-red-700">
                  {message ||
                    "Could not save branding settings. Please try again."}
                </p>
              ) : saveState === "saving" ? (
                <p className="truncate text-xs text-slate-600">
                  Saving…
                </p>
              ) : saveState === "saved" ? (
                <p className="truncate text-xs text-emerald-700">
                  Branding settings saved.
                </p>
              ) : dirty ? (
                <p className="truncate text-xs text-slate-600">
                  You have unsaved changes.
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  const form = document.getElementById(
                    "branding-settings-form"
                  ) as HTMLFormElement | null;
                  form?.requestSubmit();
                }}
                disabled={saveState === "saving" || !dirty}
                className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-slate-800 disabled:cursor-default disabled:opacity-50"
              >
                {saveState === "saving" ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
